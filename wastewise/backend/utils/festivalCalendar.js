const festivalCalendar = {
  hindu: [
    { name: 'Makar Sankranti', month: 1, day: 14 },
    { name: 'Maha Shivaratri', month: 2, day: 26 },
    { name: 'Holi', month: 3, day: 14 },
    { name: 'Ram Navami', month: 4, day: 2 },
    { name: 'Raksha Bandhan', month: 8, day: 19 },
    { name: 'Janmashtami', month: 8, day: 26 },
    { name: 'Ganesh Chaturthi', month: 9, day: 7 },
    { name: 'Navratri', month: 10, day: 3 },
    { name: 'Diwali', month: 11, day: 1 },
    { name: 'Bhai Dooj', month: 11, day: 3 },
    { name: 'Guru Nanak Jayanti', month: 11, day: 15 },
  ],
  muslim: [
    { name: 'Eid al-Fitr', month: 4, day: 10 },
    { name: 'Eid al-Adha', month: 6, day: 16 },
    { name: 'Muharram', month: 7, day: 6 },
    { name: 'Mawlid', month: 9, day: 15 },
  ],
  sikh: [
    { name: 'Guru Gobind Singh Jayanti', month: 1, day: 20 },
    { name: 'Holla Mohalla', month: 3, day: 18 },
    { name: 'Vaisakhi', month: 4, day: 13 },
    { name: 'Guru Nanak Jayanti', month: 11, day: 15 },
  ],
  jain: [
    { name: 'Mahavir Jayanti', month: 4, day: 7 },
    { name: 'Paryushan', month: 8, day: 20 },
    { name: 'Diwali (Mahavir Nirvan)', month: 11, day: 1 },
  ],
  buddhist: [
    { name: 'Buddha Purnima', month: 5, day: 23 },
    { name: 'Ashadha Purnima', month: 7, day: 21 },
  ],
  christian: [
    { name: 'Easter', month: 4, day: 20 },
    { name: 'Christmas', month: 12, day: 25 },
    { name: 'Good Friday', month: 4, day: 18 },
    { name: 'All Saints Day', month: 11, day: 1 },
  ],
};

const getUpcomingFestival = (religion, currentMonth, daysAhead = 30) => {
  if (!religion || !festivalCalendar[religion]) return null;

  const festivals = festivalCalendar[religion];
  const currentDate = new Date();

  for (const festival of festivals) {
    let festivalDate = new Date(currentDate.getFullYear(), festival.month - 1, festival.day);

    if (festivalDate < currentDate) {
      festivalDate = new Date(currentDate.getFullYear() + 1, festival.month - 1, festival.day);
    }

    const daysUntil = Math.ceil((festivalDate - currentDate) / (1000 * 60 * 60 * 24));

    if (daysUntil <= daysAhead) {
      return { ...festival, daysUntil };
    }
  }

  return null;
};

module.exports = { festivalCalendar, getUpcomingFestival };
