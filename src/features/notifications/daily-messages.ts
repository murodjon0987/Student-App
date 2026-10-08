export interface DailyMessage {
  title: string;
  body: string;
  link: string;
}

const MESSAGES: DailyMessage[] = [
  {
    title: "Bugungi maqsading nima?",
    body: "Kunni rejalashtirib boshlang. Maqsadlaringizga bir qadam yaqinlashing.",
    link: "/goals",
  },
  {
    title: "25 daqiqa diqqat!",
    body: "Pomodoro boshlab, bir mavzuni tugatib qo'ying. Natija o'zingizni hayron qoldiradi.",
    link: "/focus",
  },
  {
    title: "Vazifalaringizni tekshiring",
    body: "Bugun bajarilishi kerak ishlar bormi? Kechga qoldirmasdan hal qiling.",
    link: "/tasks",
  },
  {
    title: "Imtihonga tayyormisiz?",
    body: "Tayyorgarlik darajangizni yangilab, reja bo'yicha davom eting.",
    link: "/exams",
  },
  {
    title: "Xarajatlaringizni yozdingizmi?",
    body: "Bugungi xarajatlarni kiriting — budjet nazorati osonlashadi.",
    link: "/budget",
  },
  {
    title: "Uy vazifasi kutib turibdi",
    body: "Topshirish muddatini o'tkazib yubormang. Hoziroq belgilab qo'ying.",
    link: "/homework",
  },
  {
    title: "Eslatmalaringiz bormi?",
    body: "Muhim fikrni yozib qo'ying — keyin kerak bo'ladi.",
    link: "/notes",
  },
  {
    title: "GPA'ngizni kuzatib boring",
    body: "Baholaringizni kiritib, umumiy natijani ko'ring.",
    link: "/gpa",
  },
  {
    title: "O'qish statistikasi",
    body: "Bu hafta qancha vaqt o'qidingiz? Tahlil qilib ko'ring.",
    link: "/analytics",
  },
  {
    title: "Dars jadvalini ko'ring",
    body: "Ertangi darslaringizni oldindan bilib oling.",
    link: "/schedule",
  },
  {
    title: "Materiallaringiz tartibdami?",
    body: "Yangi foydali resurs qo'shib, bilim zaxirangizni boyiting.",
    link: "/materials",
  },
  {
    title: "Kichik qadam — katta natija",
    body: "Bugun bitta vazifani bajarsangiz ham, ertaga o'zingizga rahmat aytasiz.",
    link: "/dashboard",
  },
  {
    title: "AI yordamchi yoningizda",
    body: "Savolingiz bormi? AI yordamchidan so'rang — tez javob oladi.",
    link: "/ai",
  },
  {
    title: "Yangi kun, yangi imkoniyat",
    body: "Bugun nimani o'rganmoqchisiz? Reja tuzib, boshlasangiz bo'ldi.",
    link: "/dashboard",
  },
  {
    title: "Istalgan joyga oson yetib boring",
    body: "Transport bo'limida metro va avtobus yo'nalishlarini ko'ring.",
    link: "/transport",
  },
];

export function getDailyMessage(date: Date): DailyMessage {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  return MESSAGES[dayOfYear % MESSAGES.length];
}

export const DAILY_MESSAGES = MESSAGES;
