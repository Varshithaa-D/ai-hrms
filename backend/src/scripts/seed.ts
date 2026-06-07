import * as dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ai_hrms');
  console.log('Connected. Seeding...');

  await mongoose.connection.collection('users').deleteMany({});
  await mongoose.connection.collection('employees').deleteMany({});

  const hashed = await bcrypt.hash('password123', 10);

  // Create employee records first
  const employeeRecords = [
    {
      employeeId: 'EMP0001',
      firstName: 'Arjun', lastName: 'Sharma',
      email: 'admin@hrms.com', phone: '9876543210',
      department: 'Management', designation: 'CEO',
      employmentType: 'full_time',
      joiningDate: new Date('2020-01-15'),
      salary: { basic: 150000, hra: 60000, allowances: 30000, deductions: 5000 },
      isActive: true, createdAt: new Date(), updatedAt: new Date()
    },
    {
      employeeId: 'EMP0002',
      firstName: 'Priya', lastName: 'Nair',
      email: 'manager@hrms.com', phone: '9876543211',
      department: 'Engineering', designation: 'Senior Manager',
      employmentType: 'full_time',
      joiningDate: new Date('2020-06-01'),
      salary: { basic: 120000, hra: 48000, allowances: 24000, deductions: 4000 },
      isActive: true, createdAt: new Date(), updatedAt: new Date()
    },
    {
      employeeId: 'EMP0003',
      firstName: 'Rahul', lastName: 'Mehta',
      email: 'hr@hrms.com', phone: '9876543212',
      department: 'HR', designation: 'HR Manager',
      employmentType: 'full_time',
      joiningDate: new Date('2021-03-10'),
      salary: { basic: 80000, hra: 32000, allowances: 16000, deductions: 3000 },
      isActive: true, createdAt: new Date(), updatedAt: new Date()
    },
    {
      employeeId: 'EMP0004',
      firstName: 'Sneha', lastName: 'Iyer',
      email: 'emp@hrms.com', phone: '9876543213',
      department: 'Engineering', designation: 'Software Engineer',
      employmentType: 'full_time',
      joiningDate: new Date('2022-07-20'),
      salary: { basic: 60000, hra: 24000, allowances: 12000, deductions: 2500 },
      isActive: true, createdAt: new Date(), updatedAt: new Date()
    },
  ];

  const empResult = await mongoose.connection.collection('employees').insertMany(employeeRecords);
  console.log('✓ 4 demo employee records created');

  // Create users with employeeId reference
  const empIds = Object.values(empResult.insertedIds);
  const users = [
    { name: 'Arjun Sharma',  email: 'admin@hrms.com',   password: hashed, role: 'management_admin', employeeId: empIds[0], isActive: true },
    { name: 'Priya Nair',    email: 'manager@hrms.com', password: hashed, role: 'senior_manager',   employeeId: empIds[1], isActive: true },
    { name: 'Rahul Mehta',   email: 'hr@hrms.com',      password: hashed, role: 'hr_recruiter',     employeeId: empIds[2], isActive: true },
    { name: 'Sneha Iyer',    email: 'emp@hrms.com',     password: hashed, role: 'employee',         employeeId: empIds[3], isActive: true },
  ];

  await mongoose.connection.collection('users').insertMany(users);
  console.log('✓ 4 demo users created with employee links');

  // Seed 50 more varied employees for demo richness
  const depts = ['Engineering','Product','Design','Marketing','HR','Finance','Operations','Sales'];
  const desigs = ['Software Engineer','Senior Engineer','Product Manager','UI Designer','Marketing Lead','HR Executive','Financial Analyst','Operations Manager'];
  const names = [
    ['Amit','Kumar'],['Deepa','Reddy'],['Vijay','Singh'],['Anjali','Gupta'],['Ravi','Sharma'],
    ['Meera','Patel'],['Suresh','Nair'],['Kavitha','Menon'],['Arjun','Verma'],['Pooja','Iyer'],
    ['Kiran','Rao'],['Sunita','Joshi'],['Manoj','Tiwari'],['Divya','Pillai'],['Rajesh','Choudhary'],
    ['Nisha','Kapoor'],['Arun','Mishra'],['Swati','Shah'],['Prakash','Bose'],['Lakshmi','Naidu'],
    ['Nitin','Pandey'],['Rekha','Sinha'],['Mohan','Das'],['Usha','Trivedi'],['Ganesh','Iyengar'],
    ['Radha','Krishnan'],['Vinod','Bajaj'],['Poonam','Awasthi'],['Sunil','Deshpande'],['Anita','Kulkarni'],
    ['Rohit','Jain'],['Smita','Goyal'],['Dinesh','Rajan'],['Neha','Shetty'],['Ashok','Varma'],
    ['Geetha','Subramanian'],['Santosh','Pillai'],['Preethi','Nambiar'],['Bhaskar','Hegde'],['Saranya','Kumar'],
    ['Venkat','Ramaiah'],['Malathi','Swamy'],['Jagadeesh','Rao'],['Bhavani','Shankar'],['Murali','Krishna'],
    ['Sudha','Murthy'],['Anand','Prakash'],['Vasantha','Devi'],['Ramesh','Babu'],['Sumitra','Nair'],
  ];

  const extraEmployees = names.map((n, i) => ({
    employeeId: `EMP${String(i + 5).padStart(4, '0')}`,
    firstName: n[0], lastName: n[1],
    email: `${n[0].toLowerCase()}.${n[1].toLowerCase()}@fwc.com`,
    phone: `98765${String(43214 + i).padStart(5, '0')}`,
    department: depts[i % depts.length],
    designation: desigs[i % desigs.length],
    employmentType: i % 8 === 0 ? 'contract' : i % 12 === 0 ? 'intern' : 'full_time',
    joiningDate: new Date(2019 + (i % 5), i % 12, (i % 28) + 1),
    salary: {
      basic: 45000 + (i * 1500),
      hra: 18000 + (i * 600),
      allowances: 10000,
      deductions: 2500
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }));

  await mongoose.connection.collection('employees').insertMany(extraEmployees);
  console.log(`✓ ${extraEmployees.length} additional employees created`);

  const total = await mongoose.connection.collection('employees').countDocuments();
  console.log(`✓ Total employees: ${total}`);

  await mongoose.disconnect();
  console.log('✓ Seeding complete!');
};

seed().catch(console.error);