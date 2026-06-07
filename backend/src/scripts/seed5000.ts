import * as dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ai_hrms');
  console.log('Connected. Seeding 5000 employees...');

  const existing = await mongoose.connection.collection('employees').countDocuments();
  if (existing >= 5000) { console.log(`Already have ${existing} employees.`); await mongoose.disconnect(); return; }

  const depts = ['Engineering','Product','Design','Marketing','HR','Finance','Operations','Sales','Legal','Support'];
  const desigs = ['Software Engineer','Senior Engineer','Tech Lead','Product Manager','Designer','Analyst','Executive','Associate','Manager','Director'];
  const types  = ['full_time','full_time','full_time','part_time','contract','intern'];
  const cities = ['Bangalore','Mumbai','Delhi','Hyderabad','Chennai','Pune'];

  const batch: any[] = [];
  for (let i = existing + 1; i <= 5000; i++) {
    const dept = depts[i % depts.length];
    const yr   = 2018 + (i % 7);
    batch.push({
      employeeId:     `EMP${String(i).padStart(5,'0')}`,
      firstName:      `Employee`,
      lastName:       `${String(i).padStart(4,'0')}`,
      email:          `emp${i}@fwc.com`,
      phone:          `9${String(i).padStart(9,'0')}`,
      department:     dept,
      designation:    desigs[i % desigs.length],
      employmentType: types[i % types.length],
      joiningDate:    new Date(yr, i % 12, (i % 28) + 1),
      salary: {
        basic:      30000 + (i % 50) * 1000,
        hra:        12000 + (i % 20) * 500,
        allowances: 8000,
        deductions: 2000
      },
      address: `${i}, Main Road, ${cities[i % cities.length]}`,
      isActive: i % 20 !== 0, // 95% active
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (batch.length === 500) {
      await mongoose.connection.collection('employees').insertMany(batch);
      console.log(`Inserted up to EMP${String(i).padStart(5,'0')}`);
      batch.length = 0;
    }
  }
  if (batch.length) await mongoose.connection.collection('employees').insertMany(batch);

  const total = await mongoose.connection.collection('employees').countDocuments();
  console.log(`✓ Total employees in DB: ${total}`);
  await mongoose.disconnect();
};

seed().catch(console.error);