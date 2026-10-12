-- Real destinations and geographic descriptions; prices are demonstration amounts in USD.
-- Dates are relative to the first import, so every date filter can be demonstrated.
-- Import only into an empty vacations table; npm run db:init checks this.
INSERT INTO vacations (destination, country, continent, description, startDate, endDate, price, imageName) VALUES
('Rome', 'Italy', 'Europe', 'Walk through the Roman Forum, explore the Colosseum and spend an evening in the streets of Trastevere.', DATE_SUB(UTC_DATE(), INTERVAL 20 DAY), DATE_SUB(UTC_DATE(), INTERVAL 14 DAY), 1290, 'rome.jpg'),
('Kyoto', 'Japan', 'Asia', 'Explore the torii gates of Fushimi Inari, the lanes of Gion and the bamboo groves of Arashiyama.', DATE_SUB(UTC_DATE(), INTERVAL 12 DAY), DATE_SUB(UTC_DATE(), INTERVAL 5 DAY), 2490, 'kyoto.jpg'),
('Paris', 'France', 'Europe', 'Discover the Louvre, stroll along the Seine and enjoy the cafes and streets around Montmartre.', DATE_SUB(UTC_DATE(), INTERVAL 3 DAY), DATE_ADD(UTC_DATE(), INTERVAL 4 DAY), 1590, 'paris.jpg'),
('Santorini', 'Greece', 'Europe', 'Discover whitewashed villages above the caldera, volcanic beaches and the walking paths around Oia.', DATE_SUB(UTC_DATE(), INTERVAL 1 DAY), DATE_ADD(UTC_DATE(), INTERVAL 5 DAY), 1890, 'santorini.jpg'),
('Bali', 'Indonesia', 'Asia', 'Spend time among the rice terraces around Ubud, visit local temples and unwind along the coast.', DATE_ADD(UTC_DATE(), INTERVAL 7 DAY), DATE_ADD(UTC_DATE(), INTERVAL 16 DAY), 2290, 'bali.jpg'),
('Madrid', 'Spain', 'Europe', 'Explore the Prado Museum, stroll through Retiro Park and discover the architecture along Gran Via.', DATE_ADD(UTC_DATE(), INTERVAL 12 DAY), DATE_ADD(UTC_DATE(), INTERVAL 17 DAY), 1190, 'madrid.jpg'),
('Maldives', 'Maldives', 'Asia', 'Relax on coral islands in the Indian Ocean, snorkel in clear lagoons and enjoy time by the water.', DATE_ADD(UTC_DATE(), INTERVAL 18 DAY), DATE_ADD(UTC_DATE(), INTERVAL 24 DAY), 3490, 'maldives.jpg'),
('New York', 'United States', 'North America', 'Walk through Central Park, visit the museums of Manhattan and explore the neighborhoods of Brooklyn.', DATE_ADD(UTC_DATE(), INTERVAL 25 DAY), DATE_ADD(UTC_DATE(), INTERVAL 32 DAY), 2690, 'new-york.jpg'),
('Cape Town', 'South Africa', 'Africa', 'Discover the city below Table Mountain, explore the waterfront and visit the Cape Peninsula.', DATE_ADD(UTC_DATE(), INTERVAL 30 DAY), DATE_ADD(UTC_DATE(), INTERVAL 37 DAY), 2190, 'cape-town.jpg'),
('Iceland', 'Iceland', 'Europe', 'Discover black-sand coastlines, dramatic mountain scenery and the volcanic landscapes of Iceland.', DATE_ADD(UTC_DATE(), INTERVAL 36 DAY), DATE_ADD(UTC_DATE(), INTERVAL 42 DAY), 2390, 'iceland.jpg'),
('Porto', 'Portugal', 'Europe', 'Explore the riverside streets of Ribeira, discover tiled buildings and enjoy views across the Douro River.', DATE_ADD(UTC_DATE(), INTERVAL 43 DAY), DATE_ADD(UTC_DATE(), INTERVAL 48 DAY), 1090, 'porto.jpg'),
('Sydney', 'Australia', 'Oceania', 'Discover the harbor around the Opera House and follow the coastal walking paths near Bondi Beach.', DATE_ADD(UTC_DATE(), INTERVAL 50 DAY), DATE_ADD(UTC_DATE(), INTERVAL 59 DAY), 3290, 'sydney.jpg');

