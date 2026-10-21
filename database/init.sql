-- 本机演示数据。重复执行只补充不存在的记录，不覆盖管理界面中的修改。
CREATE TABLE IF NOT EXISTS doctors (
 id VARCHAR(32) PRIMARY KEY, username VARCHAR(64) NOT NULL UNIQUE,
 name VARCHAR(80) NOT NULL, title VARCHAR(80) NOT NULL, department VARCHAR(80) NOT NULL,
 avatar VARCHAR(500) NOT NULL, experience VARCHAR(100) NOT NULL, specialties JSON NOT NULL,
 is_active BOOLEAN NOT NULL
);
CREATE TABLE IF NOT EXISTS patients (
 id VARCHAR(32) PRIMARY KEY, name VARCHAR(80) NOT NULL, birthday VARCHAR(20), phone VARCHAR(30), gender VARCHAR(20)
);
CREATE TABLE IF NOT EXISTS accounts (
 id VARCHAR(32) PRIMARY KEY, username VARCHAR(64) NOT NULL UNIQUE,
 password_hash VARCHAR(100) NOT NULL, role ENUM('PATIENT','DOCTOR') NOT NULL,
 profile_id VARCHAR(32) NOT NULL, UNIQUE KEY unique_profile(role,profile_id)
);
INSERT IGNORE INTO doctors VALUES('doc001','dr-zhang-wei','张伟医生','主任医师','心内科','https://images.pexels.com/photos/5215024/pexels-photo-5215024.jpeg?auto=compress&cs=tinysrgb&w=400','15年临床经验','["高血压", "冠心病", "心律失常"]',true);
INSERT IGNORE INTO accounts VALUES('acc-doc001','dr-zhang-wei','$2y$10$dmBQQ5w8FbHaf57SAAEyleL6EWkbQEtK317jN7.jrACNs3u9tC5o.','DOCTOR','doc001');
INSERT IGNORE INTO doctors VALUES('doc002','dr-li-na','李娜医生','副主任医师','儿科','https://images.pexels.com/photos/5327585/pexels-photo-5327585.jpeg?auto=compress&cs=tinysrgb&w=400','10年临床经验','["儿童感冒", "儿童发育", "疫苗接种"]',true);
INSERT IGNORE INTO accounts VALUES('acc-doc002','dr-li-na','$2y$10$dmBQQ5w8FbHaf57SAAEyleL6EWkbQEtK317jN7.jrACNs3u9tC5o.','DOCTOR','doc002');
INSERT IGNORE INTO doctors VALUES('doc003','dr-wang-qiang','王强医生','主治医师','骨科','https://images.pexels.com/photos/5452293/pexels-photo-5452293.jpeg?auto=compress&cs=tinysrgb&w=400','8年临床经验','["骨折", "关节炎", "运动损伤"]',true);
INSERT IGNORE INTO accounts VALUES('acc-doc003','dr-wang-qiang','$2y$10$dmBQQ5w8FbHaf57SAAEyleL6EWkbQEtK317jN7.jrACNs3u9tC5o.','DOCTOR','doc003');
INSERT IGNORE INTO doctors VALUES('doc004','dr-liu-min','刘敏医生','主任医师','妇产科','https://images.pexels.com/photos/5452201/pexels-photo-5452201.jpeg?auto=compress&cs=tinysrgb&w=400','18年临床经验','["孕期保健", "妇科炎症", "产后恢复"]',false);
INSERT IGNORE INTO accounts VALUES('acc-doc004','dr-liu-min','$2y$10$dmBQQ5w8FbHaf57SAAEyleL6EWkbQEtK317jN7.jrACNs3u9tC5o.','DOCTOR','doc004');
INSERT IGNORE INTO doctors VALUES('doc005','dr-chen-jie','陈杰医生','副主任医师','消化内科','https://images.pexels.com/photos/5215024/pexels-photo-5215024.jpeg?auto=compress&cs=tinysrgb&w=400','12年临床经验','["胃炎", "肠道疾病", "肝病"]',true);
INSERT IGNORE INTO accounts VALUES('acc-doc005','dr-chen-jie','$2y$10$dmBQQ5w8FbHaf57SAAEyleL6EWkbQEtK317jN7.jrACNs3u9tC5o.','DOCTOR','doc005');
INSERT IGNORE INTO patients VALUES('patient001','赵明','1985-03-15','138****1234','男');
INSERT IGNORE INTO accounts VALUES('acc-patient001','patient001','$2y$10$1cFZdai5Zzr0Ls7.UZEFa.o4EY45SIkoOuXyoviDcHUCR.ks3vx5m','PATIENT','patient001');
INSERT IGNORE INTO patients VALUES('patient002','孙丽','1990-07-22','139****5678','女');
INSERT IGNORE INTO accounts VALUES('acc-patient002','patient002','$2y$10$1cFZdai5Zzr0Ls7.UZEFa.o4EY45SIkoOuXyoviDcHUCR.ks3vx5m','PATIENT','patient002');
INSERT IGNORE INTO patients VALUES('patient003','周杰','1978-11-08','137****9012','男');
INSERT IGNORE INTO accounts VALUES('acc-patient003','patient003','$2y$10$1cFZdai5Zzr0Ls7.UZEFa.o4EY45SIkoOuXyoviDcHUCR.ks3vx5m','PATIENT','patient003');
INSERT IGNORE INTO patients VALUES('patient004','吴芳','1995-05-20','136****3456','女');
INSERT IGNORE INTO accounts VALUES('acc-patient004','patient004','$2y$10$1cFZdai5Zzr0Ls7.UZEFa.o4EY45SIkoOuXyoviDcHUCR.ks3vx5m','PATIENT','patient004');
INSERT IGNORE INTO patients VALUES('patient005','郑浩','1988-09-12','135****7890','男');
INSERT IGNORE INTO accounts VALUES('acc-patient005','patient005','$2y$10$1cFZdai5Zzr0Ls7.UZEFa.o4EY45SIkoOuXyoviDcHUCR.ks3vx5m','PATIENT','patient005');
