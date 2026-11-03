// Kuratierte Tipps fürs Cockpit (öffentliche Infos, keine Buchungsdaten).
// r = Gegend (ba, ush, cal, tdp) · c = Kategorie (food, nacht, aktiv, shop) · s = Unterart
// q = Adresse/Suchbegriff für Karte und Google Maps · t = Tipp · w = passt zu (Tag)
// top: true = unsere klare Empfehlung
const TIPS = [
  // ===== BUENOS AIRES · Food & Drinks =====
  { r:"ba", c:"food", s:"Frühstück & Café", n:"Café Crespín", q:"Vera 699, Villa Crespo, Buenos Aires", t:"Pionier des Specialty Coffee in Villa Crespo, sehr guter Brunch. Ruhiges Wohnviertel statt Palermo-Trubel.", w:"Fr oder Sa früh" },
  { r:"ba", c:"food", s:"Frühstück & Café", n:"LAB Tostadores", q:"Humboldt 1542, Palermo, Buenos Aires", t:"Einer der Röster, mit denen die Kaffeewelle in Buenos Aires begann. Perfekter Stopp auf dem Palermo-Spaziergang.", w:"Fr Nachmittag" },
  { r:"ba", c:"food", s:"Frühstück & Café", n:"Los Galgos", q:"Av. Callao 501, Buenos Aires", t:"Wunderschön restaurierte historische Bar. Frühstück oder ein Revuelto Gramajo, die Alternative zum überlaufenen Café Tortoni.", w:"Sa vor dem Palacio Barolo", top:true },
  { r:"ba", c:"food", s:"Lunch", n:"MN Santa Inés", q:"Ávalos 360, La Paternal, Buenos Aires", t:"Ein echter Geheimtipp: ehemalige Bäckerei, Vintage-Deko, wechselnde Weltküche, Bib Gourmand. Nur mittags (Di–So bis ca. 15 Uhr), oft kurze Wartezeit.", w:"Sa Mittag", top:true },
  { r:"ba", c:"food", s:"Lunch", n:"El Preferido de Palermo", q:"Jorge Luis Borges 2108, Palermo, Buenos Aires", t:"Alter Almacén von 1952, heute vom Don-Julio-Team. Milanesa, Wurst aus eigener Herstellung, Wermut. Ab 11:30 geöffnet.", w:"Fr Mittag" },
  { r:"ba", c:"food", s:"Lunch", n:"Sarkis", q:"Thames 1101, Villa Crespo, Buenos Aires", t:"Armenische Küche, laut, voll, große Portionen, sehr günstig. Viele kleine Teller für alle.", w:"Fr Mittag (Alternative)" },
  { r:"ba", c:"food", s:"Lunch", n:"Mercado de San Telmo", q:"Defensa 961, San Telmo, Buenos Aires", t:"Markthalle von 1897 mit Ständen für Choripán, Empanadas und Kaffee. Gut als schnelles Mittagessen vor dem Flughafen.", w:"So Mittag" },
  { r:"ba", c:"food", s:"Dinner", n:"Don Julio", q:"Guatemala 4691, Palermo, Buenos Aires", t:"Die Parrilla schlechthin, Platz 3 der Latin America's 50 Best. Reservierung prüfen!", w:"Fr Abend" },
  { r:"ba", c:"food", s:"Dinner", n:"NESS", q:"Grecia 3691, Núñez, Buenos Aires", t:"Feuerküche in einer alten Sodafabrik, Weinbar mit DJ am Eingang. Euer Abschlussessen.", w:"Sa Abend", top:true },
  { r:"ba", c:"food", s:"Dinner", n:"Niño Gordo", q:"Thames 1810, Palermo, Buenos Aires", t:"Asiatische Parrilla unter roten Lampions. Laut, theatralisch, zwei Sitzungen am Abend.", w:"Alternative" },

  // ===== BUENOS AIRES · Abends =====
  { r:"ba", c:"nacht", s:"Listening Bar", n:"Victor Audio Bar", q:"Soler 5130, Palermo, Buenos Aires", t:"Listening Bar nach japanischem Vorbild, 2026 auf Platz 31 der World's 50 Best Bars. Vinyl auf High-End-Anlage, Martinis. Di–Sa ab 20 Uhr.", w:"Fr nach Don Julio", top:true },
  { r:"ba", c:"nacht", s:"Listening Bar", n:"Bimbi-Nilo", q:"José León Pagano 2750, Palermo, Buenos Aires", t:"Kleine Kellerbar mit maßgebauter Hi-Fi-Anlage, Jazz, Soul, Elektronik. Di–Sa 20–2 Uhr.", w:"Alternative" },
  { r:"ba", c:"nacht", s:"Cocktailbar", n:"Tres Monos", q:"Guatemala 4899, Palermo, Buenos Aires", t:"Punkige Bar mit Neon-Affen, 2026 auf Platz 21 der World's 50 Best Bars. Drinks nur mit argentinischen Zutaten.", w:"Fr, ums Eck von Don Julio" },
  { r:"ba", c:"nacht", s:"Cocktailbar", n:"Florería Atlántico", q:"Arroyo 872, Retiro, Buenos Aires", t:"Die Bar versteckt sich im Keller unter einem Blumenladen, Eingang durch die Kühlschranktür. Für einen Drink, nicht zum Essen.", w:"Optional" },
  { r:"ba", c:"nacht", s:"Tango", n:"La Catedral Club", q:"Sarmiento 4006, Almagro, Buenos Aires", t:"Echte Milonga in einer alten Lagerhalle, bohemehaft und anfängerfreundlich. Samstag ist einer der vollsten Abende. Einfach zuschauen ist völlig okay.", w:"Sa nach dem NESS", top:true },
  { r:"ba", c:"nacht", s:"Club", n:"Niceto Club (Club 69)", q:"Niceto Vega 5510, Palermo, Buenos Aires", t:"Seit 1998 eine Institution. Samstags Club 69, ab Mitternacht. Tickets online.", w:"Sa, wenn noch Energie da ist" },
  { r:"ba", c:"nacht", s:"Club", n:"Crobar", q:"Paseo de la Infanta, Palermo, Buenos Aires", t:"Großer Club unter den Bahnbögen am Rosedal, 2026 in den DJ Mag Top 100 Clubs (Platz 41). Internationale DJs.", w:"Alternative" },

  // ===== BUENOS AIRES · Aktivitäten =====
  { r:"ba", c:"aktiv", s:"Muss", n:"Cementerio de la Recoleta", q:"Junín 1760, Recoleta, Buenos Aires", t:"Stadt der Mausoleen, Evitas Grab. Morgens hingehen, dann ist es ruhig.", w:"Fr Vormittag", top:true },
  { r:"ba", c:"aktiv", s:"Muss", n:"Palacio Barolo", q:"Av. de Mayo 1370, Buenos Aires", t:"Bürohaus von 1923, gebaut nach Dantes Göttlicher Komödie, vom Architekten der Casa Palanti. Nur mit Führung (ca. 90 Min.), oben der Leuchtturm mit 360°-Blick. Vorab buchen.", w:"Sa Vormittag", top:true },
  { r:"ba", c:"aktiv", s:"Museum", n:"MALBA", q:"Av. Figueroa Alcorta 3415, Buenos Aires", t:"Das Museum für lateinamerikanische Kunst, Frida Kahlo, Diego Rivera, Xul Solar. Toller Museumsshop für Design-Andenken. Öffnungszeiten vorher prüfen.", w:"Fr, wenn Lust auf Kunst" },
  { r:"ba", c:"aktiv", s:"Museum", n:"Fundación PROA", q:"Av. Pedro de Mendoza 1929, La Boca, Buenos Aires", t:"Zeitgenössische Kunst mit Dachterrasse. Der beste Grund für La Boca, mehr als Caminito.", w:"Optional" },
  { r:"ba", c:"aktiv", s:"Spaziergang", n:"Plaza de Mayo", q:"Plaza de Mayo, Buenos Aires", t:"Vom Barolo einfach die Avenida de Mayo runterlaufen: Casa Rosada und Cabildo im Vorbeigehen. Mehr Zeit braucht es nicht.", w:"Sa nach dem Barolo" },
  { r:"ba", c:"aktiv", s:"Markt", n:"Feria de San Telmo", q:"Defensa y Humberto Primo, San Telmo, Buenos Aires", t:"Nur sonntags. Antiquitäten, Siphons, alte Fotos. Abzweigen in die Seitenstraßen lohnt sich.", w:"So Vormittag", top:true },
  { r:"ba", c:"aktiv", s:"Viertel", n:"Chacarita", q:"Plaza Los Andes, Chacarita, Buenos Aires", t:"Ehemaliges Arbeiterviertel, heute Cafés, Wandbilder und kleine Bars. Gut nach dem Lunch im Santa Inés.", w:"Sa Nachmittag" },

  // ===== BUENOS AIRES · Shopping =====
  { r:"ba", c:"shop", s:"Platte (Option 1)", n:"Mercurio (in der Galería Patio del Liceo)", q:"Av. Santa Fe 2729, Buenos Aires", t:"Neue Platten von argentinischen Indie-Bands, Elektronik, Rock und Cumbia: ein echt argentinisches Andenken. Die Galerie drumherum ist voller kleiner Designläden und Werkstätten.", w:"Fr nach Recoleta", top:true },
  { r:"ba", c:"shop", s:"Platte (Option 2)", n:"Estimado Vinilo", q:"Carlos Calvo 423, San Telmo, Buenos Aires", t:"Gebrauchte Platten aus 55 Jahren Sammlung eines Besitzers: Tango, Rock nacional, Jazz. Mit Geschichten. Sonntagsöffnung vorher prüfen.", w:"So zur Feria" },
  { r:"ba", c:"shop", s:"Design", n:"Elementos Argentinos", q:"Gurruchaga 1881, Palermo, Buenos Aires", t:"Fair gehandelte Webwaren aus dem Nordwesten, Naturfarben. Läufer, Alpaka-Schals, kleine Mitbringsel. So/Mo zu.", w:"Fr Nachmittag" },
  { r:"ba", c:"shop", s:"Design", n:"Calma Chicha", q:"Honduras 4925, Palermo, Buenos Aires", t:"Argentinische Wohnobjekte mit Humor: Kuhfell, Mate-Zubehör, Pinguin-Weinkrüge.", w:"Fr Nachmittag" },
  { r:"ba", c:"shop", s:"Design", n:"Soho Market Design", q:"Thames 1555, Palermo, Buenos Aires", t:"Kuratierte Auswahl unabhängiger argentinischer Designer: Mode, Accessoires, Objekte.", w:"Fr Nachmittag" },

  // ===== USHUAIA =====
  { r:"ush", c:"food", s:"Frühstück & Café", n:"Ramos Generales", q:"Av. Maipú 749, Ushuaia", t:"Altes Kolonialwarenhaus voller Antiquitäten. Kaffee, Medialunas, Kuchen, perfekt bei Regen.", top:true },
  { r:"ush", c:"food", s:"Dinner", n:"Chez Manu", q:"Camino del Martial 2135, Ushuaia", t:"Am Hang über der Stadt, französisch-patagonisch, vielleicht die beste Merluza negra. Zum Sonnenuntergang reservieren.", top:true },
  { r:"ush", c:"food", s:"Dinner", n:"María Lola Restó", q:"Deloqui 1048, Ushuaia", t:"Meeresfrüchte und Forellen-Risotto mit Blick auf den Beagle-Kanal. Reservieren." },
  { r:"ush", c:"food", s:"Dinner", n:"Kalma Restó", q:"Kalma Resto, Ushuaia", t:"Kleines Autorenrestaurant mit Degustationsmenü aus Feuerland. Nur wenige Tische, früh reservieren." },
  { r:"ush", c:"aktiv", s:"Wandern", n:"Glaciar Vinciguerra & Laguna de los Témpanos", q:"Valle de Andorra, Ushuaia", t:"Die schönste Tageswanderung bei Ushuaia, ruhiger als die Esmeralda. 6–7 Std., steil, Mitte November evtl. Schnee. Nur, wenn ihr euch vor dem O frisch fühlt." },
  { r:"ush", c:"aktiv", s:"Wandern", n:"Laguna Esmeralda", q:"Laguna Esmeralda, Tierra del Fuego", t:"Ca. 9 km, moderat, sehr matschig. Ab Anfang November taut der See auf. Früh los, es ist der beliebteste Weg." },
  { r:"ush", c:"shop", s:"Handwerk", n:"Feria de Artesanos", q:"Plaza 25 de Mayo, Ushuaia", t:"Lokale Kunsthandwerker hinter dem Info-Büro am Hafen, z. B. Ringe aus Münzen. Morgens, vor den Kreuzfahrtgästen." },
  { r:"ush", c:"shop", s:"Essbares", n:"Laguna Negra", q:"Laguna Negra chocolates, Av. San Martín, Ushuaia", t:"Schokolade aus Ushuaia seit 1989: Bombons, Alfajores, heiße Schokolade." },

  // ===== EL CALAFATE =====
  { r:"cal", c:"food", s:"Frühstück & Café", n:"Miles Coffee House", q:"Miles Coffee House, El Calafate", t:"Der beste Kaffee im Ort." },
  { r:"cal", c:"food", s:"Dinner", n:"Mi Rancho", q:"9 de Julio y Gobernador Moyano, El Calafate", t:"Klein und gemütlich: Ossobuco, Pasta mit Königskrabbe, Lamm. Ein paar Tage vorher reservieren.", top:true },
  { r:"cal", c:"food", s:"Dinner", n:"La Tablita", q:"La Tablita, El Calafate", t:"Die Klassiker-Parrilla für Cordero patagónico vom Spieß, seit Jahrzehnten." },
  { r:"cal", c:"food", s:"Dinner", n:"Pura Vida", q:"Av. del Libertador 1876, El Calafate", t:"Gemütlich, Hausmannskost, Blick auf den See. Lockerer als die Parrillas." },
  { r:"cal", c:"nacht", s:"Brauerei", n:"La Zorra Taproom", q:"La Zorra Taproom, El Calafate", t:"Die Lieblingsbrauerei im Ort. Merch gibt's nur hier." },
  { r:"cal", c:"aktiv", s:"Natur", n:"Reserva Laguna Nimez", q:"Reserva Laguna Nimez, El Calafate", t:"Vogelschutzgebiet mit Flamingos, wenige Minuten vom Hotel Bahía Redonda. Abendspaziergang nach dem Gletscher.", top:true },
  { r:"cal", c:"shop", s:"Handwerk", n:"Paseo de los Artesanos", q:"Av. del Libertador 1120, El Calafate", t:"Kunsthandwerk aus der Region: Keramik, Silber, Leder, Wolle." },

  // ===== TORRES DEL PAINE =====
  { r:"tdp", c:"aktiv", s:"Highlight", n:"Paso John Gardner", q:"Paso John Gardner, Torres del Paine", t:"Höchster Punkt des O mit Blick aufs Eisfeld. Pause einplanen, Windjacke griffbereit." },
  { r:"tdp", c:"aktiv", s:"Highlight", n:"Lago Dickson", q:"Refugio Dickson, Torres del Paine", t:"Die stille Rückseite des Massivs: Gletscher, See, kaum Leute. Hier lohnt es sich, langsam zu sein." },
  { r:"tdp", c:"aktiv", s:"Highlight", n:"Mirador Base Las Torres", q:"Mirador Base Las Torres, Torres del Paine", t:"Euer Finale. Wer kann: zum Sonnenaufgang oben sein." }
];
const TIP_CATS = { food: ["Food & Drinks", "#d26a12"], nacht: ["Abends", "#8e44ad"], aktiv: ["Aktivitäten", "#2f7a45"], shop: ["Shopping", "#0d6f7b"] };
