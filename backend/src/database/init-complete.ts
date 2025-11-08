import { db } from './db';
import bcrypt from 'bcryptjs';

/**
 * 完整的数据库初始化脚本
 * 整合所有表创建、字段添加和默认数据
 */

// 辅助函数：检查表是否存在
const tableExists = async (tableName: string): Promise<boolean> => {
  return new Promise((resolve) => {
    db.get(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [tableName],
      (_err: Error | null, row: any) => {
        resolve(!!row);
      }
    );
  });
};

// 辅助函数：检查列是否存在
const columnExists = async (tableName: string, columnName: string): Promise<boolean> => {
  return new Promise((resolve) => {
    db.all(`PRAGMA table_info(${tableName})`, (_err: Error | null, rows: any[]) => {
      if (_err) {
        resolve(false);
        return;
      }
      const exists = rows.some((col: any) => col.name === columnName);
      resolve(exists);
    });
  });
};

// 辅助函数：添加列（如果不存在）
const addColumnIfNotExists = async (tableName: string, columnName: string, columnDef: string): Promise<void> => {
  const exists = await columnExists(tableName, columnName);
  if (!exists) {
    await new Promise<void>((resolve, reject) => {
      db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`, (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log(`  ✅ 添加列 ${tableName}.${columnName}`);
  } else {
    console.log(`  ℹ️  列 ${tableName}.${columnName} 已存在`);
  }
};

const initCompleteDatabase = async () => {
  try {
    console.log('========================================');
    console.log('开始完整数据库初始化');
    console.log('========================================\n');

    // ==================== 1. 用户表 ====================
    console.log('📝 [1/10] 初始化用户表...');
    if (!(await tableExists('users'))) {
      await new Promise<void>((resolve, reject) => {
        db.run(`
          CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            studentId TEXT UNIQUE NOT NULL,
            className TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            isAdmin INTEGER DEFAULT 0,
            isMember INTEGER DEFAULT 1,
            points INTEGER DEFAULT 0,
            createdAt DATETIME DEFAULT (datetime('now', 'localtime'))
          )
        `, (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('  ✅ 用户表创建成功');
    } else {
      console.log('  ℹ️  用户表已存在');
    }

    // 添加扩展字段
    await addColumnIfNotExists('users', 'phone', 'TEXT');
    await addColumnIfNotExists('users', 'grade', 'TEXT');
    await addColumnIfNotExists('users', 'isSuperAdmin', 'INTEGER DEFAULT 0');

    // 创建默认管理员
    const adminExists = await new Promise<boolean>((resolve) => {
      db.get('SELECT id FROM users WHERE isAdmin = 1', (_err: Error | null, row: any) => {
        resolve(!!row);
      });
    });

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await new Promise<void>((resolve, reject) => {
        db.run(
          'INSERT INTO users (username, name, studentId, className, grade, email, phone, password, isAdmin, isSuperAdmin, isMember, points) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          ['admin', '系统管理员', 'ADMIN001', '管理员', '2024', 'admin@robotlab.com', '13800000000', hashedPassword, 1, 1, 1, 0],
          (err: Error | null) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      console.log('  ✅ 默认超级管理员创建成功 (用户名: admin, 密码: admin123)');
    } else {
      // 确保第一个管理员是超级管理员
      await new Promise<void>((resolve, reject) => {
        db.run(
          'UPDATE users SET isSuperAdmin = 1 WHERE id = (SELECT id FROM users WHERE isAdmin = 1 ORDER BY id LIMIT 1)',
          (err: Error | null) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      console.log('  ✅ 第一个管理员已设置为超级管理员');
    }

    // ==================== 2. 规则表 ====================
    console.log('\n📝 [2/10] 初始化规则表...');
    if (!(await tableExists('rules'))) {
      await new Promise<void>((resolve, reject) => {
        db.run(`
          CREATE TABLE rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            points INTEGER NOT NULL,
            description TEXT,
            createdAt DATETIME DEFAULT (datetime('now', 'localtime'))
          )
        `, (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('  ✅ 规则表创建成功');
    } else {
      console.log('  ℹ️  规则表已存在');
    }

    // 创建默认规则
    const rulesExist = await new Promise<boolean>((resolve) => {
      db.get('SELECT id FROM rules LIMIT 1', (_err: Error | null, row: any) => {
        resolve(!!row);
      });
    });

    if (!rulesExist) {
      const defaultRules = [
        { name: '完成实验报告', points: 10, description: '按时提交实验报告' },
        { name: '参加组会', points: 5, description: '参加每周组会' },
        { name: '发表论文', points: 100, description: '在会议或期刊发表论文' },
        { name: '协助实验室建设', points: 15, description: '参与实验室设备维护和建设' },
        { name: '迟到', points: -5, description: '组会或活动迟到' },
        { name: '未完成任务', points: -10, description: '未按时完成分配的任务' }
      ];

      for (const rule of defaultRules) {
        await new Promise<void>((resolve, reject) => {
          db.run(
            'INSERT INTO rules (name, points, description) VALUES (?, ?, ?)',
            [rule.name, rule.points, rule.description],
            (err: Error | null) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
      console.log('  ✅ 默认规则创建成功');
    }

    // ==================== 3. 积分日志表 ====================
    console.log('\n📝 [3/10] 初始化积分日志表...');
    if (!(await tableExists('point_logs'))) {
      await new Promise<void>((resolve, reject) => {
        db.run(`
          CREATE TABLE point_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            points INTEGER NOT NULL,
            reason TEXT,
            createdBy INTEGER NOT NULL,
            createdAt DATETIME DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (userId) REFERENCES users(id),
            FOREIGN KEY (createdBy) REFERENCES users(id)
          )
        `, (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('  ✅ 积分日志表创建成功');
    } else {
      console.log('  ℹ️  积分日志表已存在');
    }

    // ==================== 4. 积分申诉表 ====================
    console.log('\n📝 [4/10] 初始化积分申诉表...');
    if (!(await tableExists('point_requests'))) {
      await new Promise<void>((resolve, reject) => {
        db.run(`
          CREATE TABLE point_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            points INTEGER NOT NULL,
            reason TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            createdAt DATETIME DEFAULT (datetime('now', 'localtime')),
            respondedAt DATETIME,
            respondedBy INTEGER,
            adminComment TEXT,
            FOREIGN KEY (userId) REFERENCES users(id),
            FOREIGN KEY (respondedBy) REFERENCES users(id)
          )
        `, (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('  ✅ 积分申诉表创建成功');
    } else {
      console.log('  ℹ️  积分申诉表已存在');
    }

    // ==================== 5. 请假表 ====================
    console.log('\n📝 [5/10] 初始化请假表...');
    if (!(await tableExists('leaves'))) {
      await new Promise<void>((resolve, reject) => {
        db.run(`
          CREATE TABLE leaves (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            leaveType TEXT NOT NULL,
            startTime DATETIME NOT NULL,
            endTime DATETIME NOT NULL,
            duration TEXT NOT NULL,
            reason TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            createdAt DATETIME DEFAULT (datetime('now', 'localtime')),
            respondedAt DATETIME,
            respondedBy INTEGER,
            rejectReason TEXT,
            FOREIGN KEY (userId) REFERENCES users(id),
            FOREIGN KEY (respondedBy) REFERENCES users(id)
          )
        `, (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('  ✅ 请假表创建成功');
    } else {
      console.log('  ℹ️  请假表已存在');
    }

    // ==================== 6. 电子书表 ====================
    console.log('\n📝 [6/10] 初始化电子书表...');
    if (!(await tableExists('ebooks'))) {
      await new Promise<void>((resolve, reject) => {
        db.run(`
          CREATE TABLE ebooks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            originalName TEXT NOT NULL,
            fileSize INTEGER NOT NULL,
            uploadedBy INTEGER NOT NULL,
            uploadedAt DATETIME DEFAULT (datetime('now', 'localtime')),
            b2Synced INTEGER DEFAULT 0,
            b2Path TEXT,
            FOREIGN KEY (uploadedBy) REFERENCES users(id)
          )
        `, (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('  ✅ 电子书表创建成功');
    } else {
      console.log('  ℹ️  电子书表已存在');
    }

    // 添加分类字段
    await addColumnIfNotExists('ebooks', 'categoryId', 'INTEGER REFERENCES ebook_categories(id)');

    // 电子书分类表
    if (!(await tableExists('ebook_categories'))) {
      await new Promise<void>((resolve, reject) => {
        db.run(`
          CREATE TABLE ebook_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            createdAt DATETIME DEFAULT (datetime('now', 'localtime')),
            createdBy INTEGER NOT NULL,
            FOREIGN KEY (createdBy) REFERENCES users(id)
          )
        `, (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('  ✅ 电子书分类表创建成功');

      // 创建默认分类
      const admin = await new Promise<any>((resolve, reject) => {
        db.get('SELECT id FROM users WHERE isAdmin = 1 LIMIT 1', (err: Error | null, row: any) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (admin) {
        const defaultCategories = [
          { name: '未分类', description: '尚未分类的书籍' },
          { name: '编程语言', description: 'C++、Python、Java等编程语言相关书籍' },
          { name: '机器人学', description: '机器人理论、控制、导航等相关书籍' },
          { name: '人工智能', description: '深度学习、机器学习、计算机视觉等' },
          { name: '数学与算法', description: '数学基础、算法设计与分析' },
          { name: '电子电路', description: '电子电路、嵌入式系统相关' },
          { name: '其他', description: '其他类别书籍' }
        ];

        for (const category of defaultCategories) {
          await new Promise<void>((resolve, reject) => {
            db.run(
              'INSERT INTO ebook_categories (name, description, createdBy) VALUES (?, ?, ?)',
              [category.name, category.description, admin.id],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }
        console.log('  ✅ 默认书籍分类创建成功');

        // 将现有书籍设为未分类
        const uncategorized = await new Promise<any>((resolve, reject) => {
          db.get('SELECT id FROM ebook_categories WHERE name = ?', ['未分类'], (err: Error | null, row: any) => {
            if (err) reject(err);
            else resolve(row);
          });
        });

        if (uncategorized) {
          await new Promise<void>((resolve, reject) => {
            db.run(
              'UPDATE ebooks SET categoryId = ? WHERE categoryId IS NULL',
              [uncategorized.id],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }
      }
    }

    // ==================== 7. 点名系统表 ====================
    console.log('\n📝 [7/10] 初始化点名系统表...');
    
    // 点名任务表
    if (!(await tableExists('attendances'))) {
      await new Promise<void>((resolve, reject) => {
        db.run(`
          CREATE TABLE attendances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            dateStart TEXT NOT NULL,
            dateEnd TEXT NOT NULL,
            locationName TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            radius INTEGER NOT NULL,
            penaltyPoints INTEGER DEFAULT 5,
            createdBy INTEGER NOT NULL,
            createdAt DATETIME DEFAULT (datetime('now', 'localtime')),
            completed INTEGER DEFAULT 0,
            FOREIGN KEY (createdBy) REFERENCES users(id)
          )
        `, (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('  ✅ 点名任务表创建成功');
    } else {
      console.log('  ℹ️  点名任务表已存在');
    }

    // 添加目标人群字段
    await addColumnIfNotExists('attendances', 'targetGrades', 'TEXT');
    await addColumnIfNotExists('attendances', 'targetUserIds', 'TEXT');

    // 每日触发记录表
    if (!(await tableExists('daily_attendance_triggers'))) {
      await new Promise<void>((resolve, reject) => {
        db.run(`
          CREATE TABLE daily_attendance_triggers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            attendanceId INTEGER NOT NULL,
            triggerDate TEXT NOT NULL,
            triggerTime TEXT NOT NULL,
            notificationSent INTEGER DEFAULT 0,
            completed INTEGER DEFAULT 0,
            isManual INTEGER DEFAULT 0,
            createdAt DATETIME DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (attendanceId) REFERENCES attendances(id),
            UNIQUE(attendanceId, triggerDate)
          )
        `, (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('  ✅ 每日触发记录表创建成功');
    }

    // 签到记录表
    if (!(await tableExists('attendance_records'))) {
      await new Promise<void>((resolve, reject) => {
        db.run(`
          CREATE TABLE attendance_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            triggerId INTEGER NOT NULL,
            userId INTEGER NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            signedAt DATETIME DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (triggerId) REFERENCES daily_attendance_triggers(id),
            FOREIGN KEY (userId) REFERENCES users(id),
            UNIQUE(triggerId, userId)
          )
        `, (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('  ✅ 签到记录表创建成功');
    }

    // ==================== 8. 设备管理表 ====================
    console.log('\n📝 [8/10] 初始化设备管理表...');

    // 设备类型表
    if (!(await tableExists('equipment_types'))) {
      await new Promise<void>((resolve, reject) => {
        db.run(`
          CREATE TABLE equipment_types (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            image TEXT,
            description TEXT,
            total_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT (datetime('now', 'localtime'))
          )
        `, (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('  ✅ 设备类型表创建成功');
    }

    // 设备实例表
    if (!(await tableExists('equipment_instances'))) {
      await new Promise<void>((resolve, reject) => {
        db.run(`
          CREATE TABLE equipment_instances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type_id INTEGER NOT NULL,
            code TEXT UNIQUE NOT NULL,
            status TEXT DEFAULT 'available',
            notes TEXT,
            created_at DATETIME DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (type_id) REFERENCES equipment_types(id)
          )
        `, (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('  ✅ 设备实例表创建成功');
    }

    // 设备借用记录表
    if (!(await tableExists('equipment_requests'))) {
      await new Promise<void>((resolve, reject) => {
        db.run(`
          CREATE TABLE equipment_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            equipment_id INTEGER NOT NULL,
            borrow_date TEXT NOT NULL,
            return_date TEXT NOT NULL,
            reason TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            admin_comment TEXT,
            approved_by INTEGER,
            approved_at DATETIME,
            returned_at DATETIME,
            created_at DATETIME DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (equipment_id) REFERENCES equipment_instances(id),
            FOREIGN KEY (approved_by) REFERENCES users(id)
          )
        `, (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('  ✅ 设备借用记录表创建成功');
    }

    // ==================== 9. 数据统计 ====================
    console.log('\n📊 [9/10] 数据统计...');
    
    const stats = {
      users: await new Promise<number>((resolve) => {
        db.get('SELECT COUNT(*) as count FROM users', (_err: Error | null, row: any) => {
          resolve(row?.count || 0);
        });
      }),
      rules: await new Promise<number>((resolve) => {
        db.get('SELECT COUNT(*) as count FROM rules', (_err: Error | null, row: any) => {
          resolve(row?.count || 0);
        });
      }),
      ebooks: await new Promise<number>((resolve) => {
        db.get('SELECT COUNT(*) as count FROM ebooks', (_err: Error | null, row: any) => {
          resolve(row?.count || 0);
        });
      }),
      categories: await new Promise<number>((resolve) => {
        db.get('SELECT COUNT(*) as count FROM ebook_categories', (_err: Error | null, row: any) => {
          resolve(row?.count || 0);
        });
      }),
      attendances: await new Promise<number>((resolve) => {
        db.get('SELECT COUNT(*) as count FROM attendances', (_err: Error | null, row: any) => {
          resolve(row?.count || 0);
        });
      }),
      equipmentTypes: await new Promise<number>((resolve) => {
        db.get('SELECT COUNT(*) as count FROM equipment_types', (_err: Error | null, row: any) => {
          resolve(row?.count || 0);
        });
      }),
    };

    console.log(`  👥 用户数量: ${stats.users}`);
    console.log(`  📋 规则数量: ${stats.rules}`);
    console.log(`  📚 电子书数量: ${stats.ebooks}`);
    console.log(`  🏷️  书籍分类: ${stats.categories}`);
    console.log(`  ✋ 点名任务: ${stats.attendances}`);
    console.log(`  📦 设备类型: ${stats.equipmentTypes}`);

    // ==================== 10. 完成 ====================
    console.log('\n✅ [10/10] 数据库初始化完成！\n');
    
    console.log('========================================');
    console.log('📝 功能清单：');
    console.log('  ✅ 用户管理（含超级管理员）');
    console.log('  ✅ 积分规则管理');
    console.log('  ✅ 积分日志和申诉');
    console.log('  ✅ 请假管理');
    console.log('  ✅ 电子书库（含分类）');
    console.log('  ✅ 智能点名系统');
    console.log('  ✅ 设备借用管理');
    console.log('========================================\n');

    console.log('🎉 所有表和默认数据已就绪！');
    console.log('🔑 默认管理员账户：');
    console.log('   用户名: admin');
    console.log('   密码: admin123');
    console.log('   权限: 超级管理员\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  }
};

initCompleteDatabase();

