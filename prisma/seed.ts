import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function day(offset: number, hours = 9, minutes = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

async function main() {
  const email = "demo@student.app";
  const passwordHash = await bcrypt.hash("demo1234", 12);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.delete({ where: { email } });
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: "Aziz Karimov",
      passwordHash,
      profile: {
        create: {
          university: "Toshkent Axborot Texnologiyalari Universiteti",
          faculty: "Kompyuter injiniringi",
          course: 2,
          group: "KI-21-01",
          monthlyBudget: 2_000_000,
          theme: "system",
        },
      },
    },
  });

  const subjects = await Promise.all(
    [
      { name: "Matematika", teacher: "A. Karimov", color: "#6366f1" },
      { name: "Dasturlash", teacher: "B. Yusupov", color: "#8b5cf6" },
      { name: "Fizika", teacher: "D. Ergashev", color: "#f97316" },
      { name: "Ingliz tili", teacher: "J. Smith", color: "#0ea5e9" },
    ].map((s) =>
      prisma.subject.create({ data: { ...s, userId: user.id } })
    )
  );

  const now = new Date();
  const weekday = now.getDay() === 0 ? 7 : now.getDay();

  await prisma.schedule.createMany({
    data: [
      {
        userId: user.id,
        subjectId: subjects[0].id,
        title: "Matematika",
        teacher: subjects[0].teacher,
        room: "201",
        dayOfWeek: weekday,
        startTime: "09:00",
        endTime: "10:30",
        color: subjects[0].color,
      },
      {
        userId: user.id,
        subjectId: subjects[1].id,
        title: "Dasturlash",
        teacher: subjects[1].teacher,
        room: "305",
        dayOfWeek: weekday,
        startTime: "11:00",
        endTime: "12:30",
        color: subjects[1].color,
      },
      {
        userId: user.id,
        subjectId: subjects[3].id,
        title: "Ingliz tili",
        teacher: subjects[3].teacher,
        room: "112",
        dayOfWeek: (weekday % 7) + 1,
        startTime: "13:00",
        endTime: "14:30",
        color: subjects[3].color,
      },
      {
        userId: user.id,
        subjectId: subjects[2].id,
        title: "Fizika",
        teacher: subjects[2].teacher,
        room: "210",
        dayOfWeek: (weekday % 7) + 2 > 7 ? 1 : (weekday % 7) + 2,
        startTime: "10:00",
        endTime: "11:30",
        color: subjects[2].color,
      },
    ],
  });

  await prisma.task.createMany({
    data: [
      {
        userId: user.id,
        subjectId: subjects[1].id,
        title: "React loyihasini yakunlash",
        description: "Dashboard komponentlarini tugatish",
        priority: "HIGH",
        status: "IN_PROGRESS",
        deadline: day(1, 18),
      },
      {
        userId: user.id,
        subjectId: subjects[0].id,
        title: "Integrallar bo'yicha mashqlar",
        priority: "MEDIUM",
        status: "PENDING",
        deadline: day(2, 20),
      },
      {
        userId: user.id,
        title: "Kutubxonaga kitob qaytarish",
        priority: "LOW",
        status: "PENDING",
        deadline: day(4, 12),
      },
      {
        userId: user.id,
        title: "Sport zaliga yozilish",
        priority: "MEDIUM",
        status: "COMPLETED",
        completedAt: day(-1),
      },
    ],
  });

  await prisma.homework.createMany({
    data: [
      {
        userId: user.id,
        subjectId: subjects[0].id,
        title: "Limitlar mavzusi — 15-20 misollar",
        priority: "HIGH",
        status: "PENDING",
        deadline: day(1, 23, 59),
      },
      {
        userId: user.id,
        subjectId: subjects[3].id,
        title: "Essay: My future profession",
        priority: "MEDIUM",
        status: "IN_PROGRESS",
        deadline: day(3, 23, 59),
      },
      {
        userId: user.id,
        subjectId: subjects[1].id,
        title: "Array metodlari amaliyoti",
        priority: "MEDIUM",
        status: "COMPLETED",
        deadline: day(-2, 23, 59),
      },
    ],
  });

  await prisma.note.createMany({
    data: [
      {
        userId: user.id,
        subjectId: subjects[1].id,
        title: "JavaScript: Array metodlari",
        content:
          "map, filter, reduce — asosiy metodlar.\n\nmap: har bir elementni o'zgartiradi.\nfilter: shartga mos elementlarni qaytaradi.\nreduce: bitta qiymatga yig'adi.",
        tags: ["javascript", "array", "frontend"],
      },
      {
        userId: user.id,
        subjectId: subjects[0].id,
        title: "Hosila qoidalari",
        content:
          "(u*v)' = u'v + uv'\n(u/v)' = (u'v - uv') / v^2\nZanjir qoidasi.",
        tags: ["matematika", "hosila"],
      },
    ],
  });

  await prisma.exam.createMany({
    data: [
      {
        userId: user.id,
        subjectId: subjects[0].id,
        title: "Matematikadan oraliq nazorat",
        date: day(5, 9),
        time: "09:00",
        room: "201",
        description: "Integral va hosilalar",
        prepProgress: 40,
      },
      {
        userId: user.id,
        subjectId: subjects[3].id,
        title: "Ingliz tili final",
        date: day(12, 11),
        time: "11:00",
        room: "112",
        prepProgress: 15,
      },
    ],
  });

  await prisma.event.createMany({
    data: [
      {
        userId: user.id,
        title: "Guruh yig'ilishi",
        type: "PERSONAL",
        start: day(1, 15),
        end: day(1, 16),
      },
      {
        userId: user.id,
        title: "Dasturlash hackathon",
        type: "PERSONAL",
        start: day(6, 10),
        end: day(6, 18),
        color: "#8b5cf6",
      },
    ],
  });

  const expenseData = [
    { category: "FOOD", amount: 120000, description: "Tushlik" },
    { category: "TRANSPORT", amount: 20000, description: "Metro" },
    { category: "STUDY", amount: 350000, description: "Kitob xaridi" },
    { category: "INTERNET", amount: 150000, description: "Oylik internet" },
    { category: "ENTERTAINMENT", amount: 90000, description: "Kino" },
    { category: "FOOD", amount: 85000, description: "Nonushta" },
  ];

  await prisma.expense.createMany({
    data: expenseData.map((e, index) => ({
      userId: user.id,
      category: e.category,
      amount: e.amount,
      description: e.description,
      date: day(-index),
    })),
  });

  await prisma.budget.create({
    data: { userId: user.id, month: monthKey(), amount: 2_000_000 },
  });

  const goal = await prisma.goal.create({
    data: {
      userId: user.id,
      title: "JavaScript'ni chuqur o'rganish",
      description: "Frontend dasturchi bo'lish yo'lida",
      targetDate: day(60),
      color: "#8b5cf6",
      tasks: {
        create: [
          { title: "Asoslar va sintaksis", done: true, order: 0 },
          { title: "DOM va eventlar", done: true, order: 1 },
          { title: "Async / await", done: false, order: 2 },
          { title: "React asoslari", done: false, order: 3 },
        ],
      },
    },
  });

  await prisma.goal.create({
    data: {
      userId: user.id,
      title: "IELTS 7.0 olish",
      targetDate: day(120),
      color: "#0ea5e9",
      tasks: {
        create: [
          { title: "Vocabulary 3000 so'z", done: false, order: 0 },
          { title: "Writing practice", done: true, order: 1 },
        ],
      },
    },
  });

  void goal;

  await prisma.studySession.createMany({
    data: [
      {
        userId: user.id,
        subjectId: subjects[1].id,
        durationMin: 50,
        mode: "POMODORO_50",
        startedAt: day(0, 8),
      },
      {
        userId: user.id,
        subjectId: subjects[0].id,
        durationMin: 25,
        mode: "POMODORO_25",
        startedAt: day(0, 14),
      },
      {
        userId: user.id,
        subjectId: subjects[1].id,
        durationMin: 90,
        mode: "POMODORO_90",
        startedAt: day(-1, 10),
      },
      {
        userId: user.id,
        subjectId: subjects[3].id,
        durationMin: 30,
        mode: "CUSTOM",
        startedAt: day(-2, 19),
      },
    ],
  });

  await prisma.material.createMany({
    data: [
      {
        userId: user.id,
        subjectId: subjects[1].id,
        title: "MDN JavaScript Guide",
        category: "PROGRAMMING",
        url: "https://developer.mozilla.org/",
        description: "Rasmiy hujjat",
      },
      {
        userId: user.id,
        subjectId: subjects[0].id,
        title: "Kalkulyus video kurs",
        category: "MATHEMATICS",
        url: "https://www.khanacademy.org/",
      },
    ],
  });

  await prisma.grade.createMany({
    data: [
      { userId: user.id, subjectName: "Matematika", credit: 4, grade: "4.5" },
      { userId: user.id, subjectName: "Dasturlash", credit: 5, grade: "5.0" },
      { userId: user.id, subjectName: "Fizika", credit: 3, grade: "4.0" },
      { userId: user.id, subjectName: "Ingliz tili", credit: 3, grade: "4.5" },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: user.id,
        title: "Matematika vazifasi ertaga tugaydi",
        message: "Limitlar mavzusi bo'yicha vazifani topshirishni unutmang.",
        type: "WARNING",
        link: "/homework",
      },
      {
        userId: user.id,
        title: "Dasturlash darsi 30 daqiqadan keyin",
        message: "305-xonada bo'lib o'tadi.",
        type: "REMINDER",
        link: "/schedule",
      },
      {
        userId: user.id,
        title: "Bugungi study goal bajarilmadi",
        message: "Yana 30 daqiqa o'qish tavsiya etiladi.",
        type: "INFO",
        read: true,
      },
    ],
  });

  console.log("✅ Seed tugadi. Login: demo@student.app / demo1234");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
