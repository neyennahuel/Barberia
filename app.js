const data = {
  shops: [
    {
      name: "Distrito 17",
      address: "Av. Central 1240",
      rating: "4.9",
      services: ["Corte clasico", "Fade", "Barba premium"],
      barbers: [
        {
          name: "Lautaro",
          slots: ["09:00", "10:30", "12:00", "15:00"],
        },
        {
          name: "Micaela",
          slots: ["11:00", "13:30", "17:00"],
        },
      ],
    },
    {
      name: "Norte Studio",
      address: "Calle 8 #110",
      rating: "4.7",
      services: ["Corte moderno", "Barba", "Perfilado"],
      barbers: [
        {
          name: "Santiago",
          slots: ["10:00", "11:30", "16:00"],
        },
        {
          name: "Abril",
          slots: ["09:30", "12:30", "18:00"],
        },
      ],
    },
    {
      name: "Barrio Sur",
      address: "San Martin 300",
      rating: "4.8",
      services: ["Corte + barba", "Color", "Kids"],
      barbers: [
        {
          name: "Lucas",
          slots: ["08:30", "10:00", "14:30", "19:00"],
        },
      ],
    },
    {
      name: "Vintage Club",
      address: "Diagonal 50",
      rating: "5.0",
      services: ["Tijera", "Barba deluxe", "Masaje"],
      barbers: [
        {
          name: "Florencia",
          slots: ["09:00", "12:00", "15:30"],
        },
        {
          name: "Ivan",
          slots: ["10:30", "13:00", "17:30"],
        },
      ],
    },
  ],
};

const shopGrid = document.getElementById("shop-grid");
const heroShop = document.getElementById("hero-shop");
const heroBarber = document.getElementById("hero-barber");
const heroTime = document.getElementById("hero-time");
const bookingShop = document.getElementById("booking-shop");
const bookingBarber = document.getElementById("booking-barber");
const bookingService = document.getElementById("booking-service");
const bookingTime = document.getElementById("booking-time");
const agendaName = document.getElementById("agenda-name");
const agendaList = document.getElementById("agenda-list");

const setOptions = (select, items) => {
  select.innerHTML = "";
  items.forEach((item) => {
    const option = document.createElement("option");
    option.textContent = item;
    option.value = item;
    select.appendChild(option);
  });
};

const setBarbers = (select, shop) => {
  const names = shop.barbers.map((barber) => barber.name);
  setOptions(select, names);
};

const setTimes = (select, barber) => {
  setOptions(select, barber.slots);
};

const updateAgenda = (barber) => {
  agendaName.textContent = barber.name;
  agendaList.innerHTML = "";
  barber.slots.forEach((slot) => {
    const li = document.createElement("li");
    li.textContent = `${slot} | Disponible`;
    agendaList.appendChild(li);
  });
};

const updateHero = (shop) => {
  setBarbers(heroBarber, shop);
  const barber = shop.barbers[0];
  setTimes(heroTime, barber);
};

const updateBooking = (shop) => {
  setBarbers(bookingBarber, shop);
  setOptions(bookingService, shop.services);
  const barber = shop.barbers[0];
  setTimes(bookingTime, barber);
  updateAgenda(barber);
};

const initShops = () => {
  data.shops.forEach((shop) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <h3>${shop.name}</h3>
      <span>${shop.address}</span>
      <p>Rating ${shop.rating} | ${shop.barbers.length} peluqueros</p>
    `;
    shopGrid.appendChild(card);
  });

  setOptions(heroShop, data.shops.map((shop) => shop.name));
  setOptions(bookingShop, data.shops.map((shop) => shop.name));

  updateHero(data.shops[0]);
  updateBooking(data.shops[0]);
};

heroShop.addEventListener("change", (event) => {
  const shop = data.shops.find((item) => item.name === event.target.value);
  if (!shop) return;
  updateHero(shop);
});

heroBarber.addEventListener("change", (event) => {
  const shop = data.shops.find((item) => item.name === heroShop.value);
  if (!shop) return;
  const barber = shop.barbers.find((item) => item.name === event.target.value);
  if (!barber) return;
  setTimes(heroTime, barber);
});

bookingShop.addEventListener("change", (event) => {
  const shop = data.shops.find((item) => item.name === event.target.value);
  if (!shop) return;
  updateBooking(shop);
});

bookingBarber.addEventListener("change", (event) => {
  const shop = data.shops.find((item) => item.name === bookingShop.value);
  if (!shop) return;
  const barber = shop.barbers.find((item) => item.name === event.target.value);
  if (!barber) return;
  setTimes(bookingTime, barber);
  updateAgenda(barber);
});

const form = document.getElementById("booking-form");
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const barber = bookingBarber.value;
  const time = bookingTime.value;
  agendaList.prepend(
    Object.assign(document.createElement("li"), {
      textContent: `${time} | Reservado por cliente`,
    })
  );
  form.reset();
  bookingShop.value = data.shops[0].name;
  updateBooking(data.shops[0]);
});

initShops();
