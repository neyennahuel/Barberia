INSERT INTO shops (name, address)
VALUES ('Distrito 17', 'Av. Central 1240');

INSERT INTO users (username, password, name, role, shop_id) VALUES
('admin', 'admin123', 'Administrador', 'admin', NULL),
('dueno', 'dueno123', 'Duenio', 'dueno', 1),
('peluquero', 'pelu123', 'Lautaro', 'peluquero', 1),
('cliente', 'cliente123', 'Camila', 'cliente', NULL);

INSERT INTO barbers (user_id, shop_id)
VALUES ((SELECT id FROM users WHERE username = 'peluquero'), 1);

INSERT INTO barber_slots (barber_id, time) VALUES
(1, '09:00'),
(1, '10:30'),
(1, '12:00'),
(1, '14:00'),
(1, '15:30'),
(1, '17:00'),
(1, '18:30');

INSERT INTO shop_services (shop_id, name, price) VALUES
(1, 'Corte clasico', 2500),
(1, 'Fade', 2800),
(1, 'Barba premium', 2200);
