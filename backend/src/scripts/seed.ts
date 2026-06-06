import * as dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ai_hrms');
  console.log('Connected. Seeding...');

  // Drop existing users
  await mongoose.connection.collection('users').deleteMany({});
  await mongoose.connection.collection('employees').deleteMany({});

  const hashed = await bcrypt.hash('password123', 10);
  console.log('Hashed password:', hashed);

  const users = [
    { name: 'Arjun Sharma',  email: 'admin@hrms.com',   password: hashed, role: 'management_admin', isActive: true },
    { name: 'Priya Nair',    email: 'manager@hrms.com', password: hashed, role: 'senior_manager',   isActive: true },
    { name: 'Rahul Mehta',   email: 'hr@hrms.com',      password: hashed, role: 'hr_recruiter',     isActive: true },
    { name: 'Sneha Iyer',    email: 'emp@hrms.com',     password: hashed, role: 'employee',         isActive: true },
  ];

  await mongoose.connection.collection('users').insertMany(users);
  console.log('✓ 4 users created with pre-hashed passwords');

  const departments = ['Engineering','Product','Design','Marketing','HR','Finance'];
  const designations = ['Software Engineer','Product Manager','UI Designer','Marketing Lead','HR Executive','Financial Analyst'];
  const employees = [];

  for (let i = 1; i <= 20; i++) {
    employees.push({
      employeeId:     `EMP${String(i).padStart(4,'0')}`,
      firstName:      `Employee`,
      lastName:       `${String(i).padStart(2,'0')}`,
      email:          `emp${i}@hrms.com`,
      phone:          `98765${String(i).padStart(5,'0')}`,
      department:     departments[i % departments.length],
      designation:    designations[i % designations.length],
      employmentType: 'full_time',
      joiningDate:    new Date(2022, i % 12, (i % 28) + 1),
      salary: { basic: 50000 + i * 2000, hra: 20000, allowances: 10000, deductions: 3000 },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  await mongoose.connection.collection('employees').insertMany(employees);
  console.log('✓ 20 employees created');

  await mongoose.disconnect();
  console.log('✓ Seeding complete!');
};

seed().catch(err => { console.error(err); process.exit(1); });