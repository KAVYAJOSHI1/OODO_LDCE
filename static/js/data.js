/**
 * GlobeTrotter - Master Travel Catalog & City-Activity Data Repository
 * City-Strict relationships with unique stable IDs, accurate metadata, and context-aware time slots.
 */

let GLOBETROTTER_CITIES = [
    {
        id: "goa",
        name: "Goa",
        state: "Goa",
        country: "India",
        region: "West India",
        costIndex: "Medium",
        popularity: "🔥🔥🔥🔥",
        activitiesCount: 8,
        activities: [
            { id: "goa-baga", cityId: "goa", name: "Baga Beach Sunset & Shacks", category: "Sightseeing", cost: 0, duration: "2.0 Hours", preferredTime: "05:00 PM", fixedSlot: true, description: "Relax and enjoy Goa's famous beach coastline during sunset hours." },
            { id: "goa-fort-aguada", cityId: "goa", name: "Fort Aguada", category: "Heritage & Monuments", cost: 300, duration: "2.5 Hours", preferredTime: "09:30 AM", fixedSlot: false, description: "17th-century Portuguese lighthouse and fort overlooking the Arabian Sea." },
            { id: "goa-dudhsagar", cityId: "goa", name: "Dudhsagar Waterfalls Trek", category: "Adventure", cost: 1800, duration: "5.0 Hours", preferredTime: "07:00 AM", fixedSlot: true, description: "Four-tiered waterfall located on the Mandovi River with morning jeep safari." },
            { id: "goa-anjuna", cityId: "goa", name: "Anjuna Flea Market", category: "Shopping", cost: 0, duration: "2.0 Hours", preferredTime: "02:00 PM", fixedSlot: false, description: "Vibrant beachside flea market for handicrafts and souvenirs." },
            { id: "goa-calangute-sports", cityId: "goa", name: "Calangute Water Sports", category: "Adventure", cost: 1500, duration: "3.0 Hours", preferredTime: "10:30 AM", fixedSlot: false, description: "Parasailing, banana boat rides, and jet skiing." },
            { id: "goa-basilica", cityId: "goa", name: "Basilica of Bom Jesus", category: "Heritage & Monuments", cost: 0, duration: "1.5 Hours", preferredTime: "02:30 PM", fixedSlot: false, description: "UNESCO World Heritage site holding the mortal remains of St. Francis Xavier." },
            { id: "goa-mandovi-cruise", cityId: "goa", name: "Mandovi River Sunset Cruise", category: "Sightseeing", cost: 650, duration: "2.0 Hours", preferredTime: "05:30 PM", fixedSlot: true, description: "Evening river cruise featuring traditional Goan folk dances at sunset." },
            { id: "goa-palolem", cityId: "goa", name: "Palolem Beach Walk", category: "Sightseeing", cost: 0, duration: "2.0 Hours", preferredTime: "11:00 AM", fixedSlot: false, description: "Scenic crescent-shaped beach surrounded by palm trees." }
        ]
    },
    {
        id: "mumbai",
        name: "Mumbai",
        state: "Maharashtra",
        country: "India",
        region: "West India",
        costIndex: "High",
        popularity: "🔥🔥🔥🔥🔥",
        activitiesCount: 8,
        activities: [
            { id: "mumbai-gateway", cityId: "mumbai", name: "Gateway of India", category: "Heritage & Monuments", cost: 0, duration: "1.5 Hours", preferredTime: "09:00 AM", fixedSlot: false, description: "Iconic arch monument built during the 20th century in Mumbai." },
            { id: "mumbai-marine-drive", cityId: "mumbai", name: "Marine Drive Evening Walk", category: "Sightseeing", cost: 0, duration: "2.0 Hours", preferredTime: "06:30 PM", fixedSlot: true, description: "3.6-kilometer-long Promenade along Queen's Necklace at sunset." },
            { id: "mumbai-elephanta", cityId: "mumbai", name: "Elephanta Caves Tour", category: "Heritage & Monuments", cost: 850, duration: "4.5 Hours", preferredTime: "09:30 AM", fixedSlot: true, description: "Ferry ride to UNESCO World Heritage rock-cut cave temples dedicated to Shiva." },
            { id: "mumbai-colaba", cityId: "mumbai", name: "Colaba Causeway Shopping", category: "Shopping", cost: 500, duration: "2.5 Hours", preferredTime: "03:00 PM", fixedSlot: false, description: "Bustling street market for jewelry, antiques, and clothes." },
            { id: "mumbai-csmt", cityId: "mumbai", name: "CSMT Railway Terminus Walk", category: "Heritage & Monuments", cost: 0, duration: "1.0 Hour", preferredTime: "01:30 PM", fixedSlot: false, description: "Victorian Gothic UNESCO World Heritage railway terminus." },
            { id: "mumbai-siddhivinayak", cityId: "mumbai", name: "Siddhivinayak Temple Visit", category: "Heritage & Monuments", cost: 0, duration: "1.5 Hours", preferredTime: "08:00 AM", fixedSlot: false, description: "Famous Hindu temple dedicated to Lord Shri Ganesha." },
            { id: "mumbai-sea-link", cityId: "mumbai", name: "Bandra-Worli Sea Link Drive", category: "Sightseeing", cost: 100, duration: "1.0 Hour", preferredTime: "08:00 PM", fixedSlot: false, description: "8-lane cable-stayed bridge linking Bandra with Worli." },
            { id: "mumbai-juhu", cityId: "mumbai", name: "Juhu Beach Night Food Walk", category: "Food Walk", cost: 400, duration: "2.0 Hours", preferredTime: "07:30 PM", fixedSlot: true, description: "Sample famous Pav Bhaji, Bhel Puri, and Kulfi at Juhu beach evening stalls." }
        ]
    },
    {
        id: "delhi",
        name: "New Delhi",
        state: "Delhi",
        country: "India",
        region: "North India",
        costIndex: "Medium",
        popularity: "🔥🔥🔥🔥🔥",
        activitiesCount: 8,
        activities: [
            { id: "delhi-india-gate", cityId: "delhi", name: "India Gate & Kartavya Path", category: "Heritage & Monuments", cost: 0, duration: "1.5 Hours", preferredTime: "05:00 PM", fixedSlot: false, description: "War memorial located astride the Rajpath in New Delhi." },
            { id: "delhi-red-fort", cityId: "delhi", name: "Red Fort Sound & Light Show", category: "Heritage & Monuments", cost: 500, duration: "2.5 Hours", preferredTime: "07:00 PM", fixedSlot: true, description: "Historic Mughal fortress in Old Delhi with evening sound & light show." },
            { id: "delhi-qutub-minar", cityId: "delhi", name: "Qutub Minar Complex", category: "Heritage & Monuments", cost: 600, duration: "3.0 Hours", preferredTime: "09:00 AM", fixedSlot: false, description: "73-metre minaret that forms part of the Qutb UNESCO complex." },
            { id: "delhi-humayun-tomb", cityId: "delhi", name: "Humayun's Tomb", category: "Heritage & Monuments", cost: 600, duration: "2.0 Hours", preferredTime: "02:00 PM", fixedSlot: false, description: "Tomb of the Mughal Emperor Humayun designed by Mirak Mirza Ghiyas." },
            { id: "delhi-lotus-temple", cityId: "delhi", name: "Lotus Temple Visit", category: "Heritage & Monuments", cost: 0, duration: "1.5 Hours", preferredTime: "11:00 AM", fixedSlot: false, description: "Baháʼí House of Worship notable for its lotuslike flower shape." },
            { id: "delhi-akshardham", cityId: "delhi", name: "Swaminarayan Akshardham Temple", category: "Heritage & Monuments", cost: 350, duration: "3.5 Hours", preferredTime: "03:30 PM", fixedSlot: false, description: "Traditional Hindu temple complex displaying Indian culture and spiritual exhibits." },
            { id: "delhi-chandni-chowk", cityId: "delhi", name: "Chandni Chowk Food & Rickshaw Walk", category: "Food Walk", cost: 800, duration: "3.0 Hours", preferredTime: "06:30 PM", fixedSlot: true, description: "Explore Paranthe Wali Gali and legendary street food markets during evening prime hours." },
            { id: "delhi-jama-masjid", cityId: "delhi", name: "Jama Masjid Old Delhi Tour", category: "Heritage & Monuments", cost: 200, duration: "2.0 Hours", preferredTime: "10:00 AM", fixedSlot: false, description: "One of the largest mosques in India, built by Mughal Emperor Shah Jahan." }
        ]
    },
    {
        id: "jaipur",
        name: "Jaipur",
        state: "Rajasthan",
        country: "India",
        region: "North India",
        costIndex: "Medium",
        popularity: "🔥🔥🔥🔥",
        activitiesCount: 8,
        activities: [
            { id: "jaipur-amer-fort", cityId: "jaipur", name: "Amer Fort Jeep Safari", category: "Heritage & Monuments", cost: 1500, duration: "3.5 Hours", preferredTime: "09:00 AM", fixedSlot: true, description: "Majestic hilltop fort known for its Hindu artistic elements and Sheesh Mahal." },
            { id: "jaipur-hawa-mahal", cityId: "jaipur", name: "Hawa Mahal & Museum", category: "Heritage & Monuments", cost: 200, duration: "1.5 Hours", preferredTime: "01:30 PM", fixedSlot: false, description: "Palace of Winds constructed of red and pink sandstone with 953 windows." },
            { id: "jaipur-city-palace", cityId: "jaipur", name: "Jaipur City Palace Museum", category: "Heritage & Monuments", cost: 700, duration: "2.5 Hours", preferredTime: "11:00 AM", fixedSlot: false, description: "Royal residence complex containing Chandra Mahal and Mubarak Mahal." },
            { id: "jaipur-jantar-mantar", cityId: "jaipur", name: "Jantar Mantar Observatory", category: "Heritage & Monuments", cost: 200, duration: "1.5 Hours", preferredTime: "03:30 PM", fixedSlot: false, description: "UNESCO collection of 19 astronomical instruments built by King Sawai Jai Singh II." },
            { id: "jaipur-jal-mahal", cityId: "jaipur", name: "Jal Mahal Viewpoint", category: "Sightseeing", cost: 0, duration: "1.0 Hour", preferredTime: "05:00 PM", fixedSlot: false, description: "Water Palace sitting in the middle of Man Sagar Lake." },
            { id: "jaipur-nahargarh", cityId: "jaipur", name: "Nahargarh Fort Sunset View", category: "Sightseeing", cost: 300, duration: "2.5 Hours", preferredTime: "05:30 PM", fixedSlot: true, description: "Fort standing on the edge of the Aravalli Hills for panoramic sunset views over Jaipur." },
            { id: "jaipur-albert-hall", cityId: "jaipur", name: "Albert Hall Museum Visit", category: "Heritage & Monuments", cost: 300, duration: "2.0 Hours", preferredTime: "02:00 PM", fixedSlot: false, description: "Oldest museum of the state functioning as the State museum of Rajasthan." },
            { id: "jaipur-johari-bazaar", cityId: "jaipur", name: "Johari Bazaar Textile Walk", category: "Shopping", cost: 500, duration: "2.0 Hours", preferredTime: "06:30 PM", fixedSlot: true, description: "Market famous for Jaipuri gems, jewelry, tie-dye textiles, and handicrafts." }
        ]
    },
    {
        id: "agra",
        name: "Agra",
        state: "Uttar Pradesh",
        country: "India",
        region: "North India",
        costIndex: "Medium",
        popularity: "🔥🔥🔥🔥🔥",
        activitiesCount: 6,
        activities: [
            { id: "agra-taj-mahal", cityId: "agra", name: "Taj Mahal Sunrise Guided Tour", category: "Heritage & Monuments", cost: 1200, duration: "3.0 Hours", preferredTime: "06:00 AM", fixedSlot: true, description: "World-famous ivory-white marble mausoleum during early morning sunrise slot." },
            { id: "agra-fort", cityId: "agra", name: "Agra Fort UNESCO Site Walk", category: "Heritage & Monuments", cost: 650, duration: "2.5 Hours", preferredTime: "09:30 AM", fixedSlot: false, description: "Historical fort in the city of Agra that served as royal Mughal residence." },
            { id: "agra-mehtab-bagh", cityId: "agra", name: "Mehtab Bagh Sunset View", category: "Sightseeing", cost: 300, duration: "2.0 Hours", preferredTime: "04:30 PM", fixedSlot: true, description: "Charbagh complex aligned perfectly for Taj Mahal sunset views across Yamuna." },
            { id: "agra-itmad-tomb", cityId: "agra", name: "Itmad-ud-Daulah (Baby Taj)", category: "Heritage & Monuments", cost: 300, duration: "1.5 Hours", preferredTime: "01:00 PM", fixedSlot: false, description: "Mughal mausoleum often described as a 'jewel box'." },
            { id: "agra-fatehpur-sikri", cityId: "agra", name: "Fatehpur Sikri Day Trip", category: "Heritage & Monuments", cost: 800, duration: "4.0 Hours", preferredTime: "11:00 AM", fixedSlot: false, description: "Red sandstone fortified ancient city founded by Mughal Emperor Akbar." },
            { id: "agra-sadar-bazaar", cityId: "agra", name: "Sadar Bazaar Marble Shopping", category: "Shopping", cost: 400, duration: "2.0 Hours", preferredTime: "07:00 PM", fixedSlot: true, description: "Popular market for Agra Petha sweets, leather goods, and marble souvenirs." }
        ]
    },
    {
        id: "ahmedabad",
        name: "Ahmedabad",
        state: "Gujarat",
        country: "India",
        region: "West India",
        costIndex: "Low",
        popularity: "🔥🔥🔥🔥",
        activitiesCount: 7,
        activities: [
            { id: "ahmedabad-sabarmati-ashram", cityId: "ahmedabad", name: "Sabarmati Ashram Tour", category: "Heritage & Monuments", cost: 0, duration: "2.0 Hours", preferredTime: "09:00 AM", fixedSlot: false, description: "Mahatma Gandhi's headquarters during the Indian independence movement." },
            { id: "ahmedabad-adalaj", cityId: "ahmedabad", name: "Adalaj Stepwell Tour", category: "Heritage & Monuments", cost: 0, duration: "1.5 Hours", preferredTime: "11:30 AM", fixedSlot: false, description: "Unique five-story deep stepwell displaying Solanki architectural style." },
            { id: "ahmedabad-kankaria", cityId: "ahmedabad", name: "Kankaria Lake Carnival Walk", category: "Sightseeing", cost: 100, duration: "2.5 Hours", preferredTime: "05:00 PM", fixedSlot: false, description: "Second largest lake in Ahmedabad with zoo, tethered balloon, and water rides." },
            { id: "ahmedabad-science-city", cityId: "ahmedabad", name: "Gujarat Science City", category: "Adventure", cost: 350, duration: "3.5 Hours", preferredTime: "01:30 PM", fixedSlot: false, description: "Science center featuring robotics gallery, aquatic gallery, and IMAX 3D theater." },
            { id: "ahmedabad-sidi-saiyyed", cityId: "ahmedabad", name: "Sidi Saiyyed Jali Tour", category: "Heritage & Monuments", cost: 0, duration: "1.0 Hour", preferredTime: "10:30 AM", fixedSlot: false, description: "Mosque famous for its intricately carved stone lattice windows (Jali)." },
            { id: "ahmedabad-manek-chowk", cityId: "ahmedabad", name: "Manek Chowk Midnight Food Walk", category: "Food Walk", cost: 500, duration: "2.0 Hours", preferredTime: "09:30 PM", fixedSlot: true, description: "Bustling city square that transforms into a vibrant night street food market." },
            { id: "ahmedabad-riverfront", cityId: "ahmedabad", name: "Sabarmati Riverfront Cruise", category: "Sightseeing", cost: 250, duration: "1.5 Hours", preferredTime: "06:30 PM", fixedSlot: true, description: "Waterfront promenade along the banks of Sabarmati River." }
        ]
    },
    {
        id: "udaipur",
        name: "Udaipur",
        state: "Rajasthan",
        country: "India",
        region: "North India",
        costIndex: "Medium",
        popularity: "🔥🔥🔥🔥",
        activitiesCount: 6,
        activities: [
            { id: "udaipur-city-palace", cityId: "udaipur", name: "Udaipur City Palace Museum", category: "Heritage & Monuments", cost: 400, duration: "3.0 Hours", preferredTime: "09:30 AM", fixedSlot: false, description: "Palace complex built over 400 years with panoramic views of Lake Pichola." },
            { id: "udaipur-lake-pichola", cityId: "udaipur", name: "Lake Pichola Sunset Boat Ride", category: "Sightseeing", cost: 700, duration: "2.0 Hours", preferredTime: "05:30 PM", fixedSlot: true, description: "Picturesque boat cruise around Jag Mandir and Lake Palace during sunset." },
            { id: "udaipur-jagdish-temple", cityId: "udaipur", name: "Jagdish Temple Visit", category: "Heritage & Monuments", cost: 0, duration: "1.0 Hour", preferredTime: "08:30 AM", fixedSlot: false, description: "Large Hindu temple in middle of Udaipur constructed in Indo-Aryan style." },
            { id: "udaipur-monsoon-palace", cityId: "udaipur", name: "Sajjangarh Monsoon Palace", category: "Sightseeing", cost: 300, duration: "2.5 Hours", preferredTime: "04:30 PM", fixedSlot: true, description: "Hilltop palatial residence overlooking Fateh Sagar Lake for sunset." },
            { id: "udaipur-saheliyon", cityId: "udaipur", name: "Saheliyon-ki-Bari Garden Walk", category: "Sightseeing", cost: 100, duration: "1.5 Hours", preferredTime: "01:00 PM", fixedSlot: false, description: "Majestic garden with marble fountains, lotus pools, and elephant statues." },
            { id: "udaipur-bagore-haveli", cityId: "udaipur", name: "Bagore Ki Haveli Folk Show", category: "Heritage & Monuments", cost: 200, duration: "2.0 Hours", preferredTime: "07:00 PM", fixedSlot: true, description: "Cultural Dharohar folk dance and puppet performance by local artists." }
        ]
    },
    {
        id: "bengaluru",
        name: "Bengaluru",
        state: "Karnataka",
        country: "India",
        region: "South India",
        costIndex: "High",
        popularity: "🔥🔥🔥🔥",
        activitiesCount: 7,
        activities: [
            { id: "bengaluru-palace", cityId: "bengaluru", name: "Bangalore Palace Tour", category: "Heritage & Monuments", cost: 480, duration: "2.5 Hours", preferredTime: "10:00 AM", fixedSlot: false, description: "Tudor-style castle built by King Chamaraja Wodeyar in 1887." },
            { id: "bengaluru-lalbagh", cityId: "bengaluru", name: "Lalbagh Botanical Garden Walk", category: "Sightseeing", cost: 100, duration: "2.0 Hours", preferredTime: "07:00 AM", fixedSlot: false, description: "240-acre botanical garden housing a famous glass house inspired by Crystal Palace." },
            { id: "bengaluru-cubbon-park", cityId: "bengaluru", name: "Cubbon Park Nature Walk", category: "Sightseeing", cost: 0, duration: "1.5 Hours", preferredTime: "04:00 PM", fixedSlot: false, description: "300-acre green park located in the heart of Bengaluru's administrative area." },
            { id: "bengaluru-vidhana-soudha", cityId: "bengaluru", name: "Vidhana Soudha Architecture View", category: "Heritage & Monuments", cost: 0, duration: "1.0 Hour", preferredTime: "02:00 PM", fixedSlot: false, description: "Seat of the state legislature constructed in Neo-Dravidian style." },
            { id: "bengaluru-iskcon", cityId: "bengaluru", name: "ISKCON Temple Meditation", category: "Heritage & Monuments", cost: 0, duration: "1.5 Hours", preferredTime: "12:00 PM", fixedSlot: false, description: "One of the largest ISKCON temple complexes in the world." },
            { id: "bengaluru-nandi-hills", cityId: "bengaluru", name: "Nandi Hills Sunrise Day Trip", category: "Adventure", cost: 350, duration: "4.0 Hours", preferredTime: "05:30 AM", fixedSlot: true, description: "Ancient hill fortress offering breathtaking sunrise vistas above clouds." },
            { id: "bengaluru-church-street", cityId: "bengaluru", name: "Church Street Cafe & Bookstore Walk", category: "Food Walk", cost: 1200, duration: "3.0 Hours", preferredTime: "06:30 PM", fixedSlot: true, description: "Popular pedestrian street lined with bookstores, cafes, and microbreweries." }
        ]
    },
    {
        id: "paris",
        name: "Paris",
        state: "Île-de-France",
        country: "France",
        region: "Europe",
        costIndex: "High",
        popularity: "🔥🔥🔥🔥🔥",
        activitiesCount: 6,
        activities: [
            { id: "paris-eiffel-tower", cityId: "paris", name: "Eiffel Tower Summit Ticket", category: "Sightseeing", cost: 2800, duration: "3.0 Hours", preferredTime: "10:00 AM", fixedSlot: true, description: "Iconic wrought-iron lattice tower on the Champ de Mars." },
            { id: "paris-louvre", cityId: "paris", name: "Louvre Museum Mona Lisa Tour", category: "Heritage & Monuments", cost: 2200, duration: "4.0 Hours", preferredTime: "01:30 PM", fixedSlot: true, description: "World's largest art museum housing Leonardo da Vinci's Mona Lisa." },
            { id: "paris-arc-de-triomphe", cityId: "paris", name: "Arc de Triomphe Observation Deck", category: "Heritage & Monuments", cost: 1400, duration: "1.5 Hours", preferredTime: "04:30 PM", fixedSlot: false, description: "Triumphal arch standing at the western end of the Champs-Élysées." },
            { id: "paris-seine-cruise", cityId: "paris", name: "Seine River Evening Cruise", category: "Sightseeing", cost: 1600, duration: "2.0 Hours", preferredTime: "07:30 PM", fixedSlot: true, description: "Romantic boat cruise passing Notre-Dame Cathedral and Parisian bridges." },
            { id: "paris-montmartre", cityId: "paris", name: "Montmartre & Sacré-Cœur Walk", category: "Sightseeing", cost: 0, duration: "2.5 Hours", preferredTime: "11:00 AM", fixedSlot: false, description: "Historic hilltop bohemian district known for artists and Basilica of the Sacré-Cœur." },
            { id: "paris-latin-quarter", cityId: "paris", name: "Latin Quarter Bakery & Cafe Walk", category: "Food Walk", cost: 1800, duration: "2.0 Hours", preferredTime: "05:30 PM", fixedSlot: false, description: "Taste fresh croissants, macarons, and French cheeses in historic cafes." }
        ]
    },
    {
        id: "dubai",
        name: "Dubai",
        state: "Dubai",
        country: "United Arab Emirates",
        region: "Middle East",
        costIndex: "High",
        popularity: "🔥🔥🔥🔥🔥",
        activitiesCount: 7,
        activities: [
            { id: "dubai-burj-khalifa", cityId: "dubai", name: "Burj Khalifa 124th Floor Deck", category: "Sightseeing", cost: 4500, duration: "2.5 Hours", preferredTime: "04:30 PM", fixedSlot: true, description: "World's tallest skyscraper offering prime sunset views of Dubai skyline." },
            { id: "dubai-mall-fountain", cityId: "dubai", name: "Dubai Mall Fountain & Aquarium", category: "Sightseeing", cost: 1200, duration: "3.0 Hours", preferredTime: "07:00 PM", fixedSlot: true, description: "World's largest shopping mall with evening choreographed musical fountain show." },
            { id: "dubai-palm-jumeirah", cityId: "dubai", name: "Palm Jumeirah Monorail & View", category: "Sightseeing", cost: 900, duration: "2.0 Hours", preferredTime: "11:00 AM", fixedSlot: false, description: "Man-made palm-shaped island featuring Atlantis, The Palm." },
            { id: "dubai-marina-cruise", cityId: "dubai", name: "Dubai Marina Yacht Dinner Cruise", category: "Sightseeing", cost: 3200, duration: "2.5 Hours", preferredTime: "08:00 PM", fixedSlot: true, description: "Luxury buffet dinner cruise along illuminated Dubai Marina skyscrapers." },
            { id: "dubai-frame", cityId: "dubai", name: "Dubai Frame Glass Bridge", category: "Sightseeing", cost: 1400, duration: "1.5 Hours", preferredTime: "02:00 PM", fixedSlot: false, description: "Architectural landmark framing views of Old and New Dubai." },
            { id: "dubai-museum-future", cityId: "dubai", name: "Museum of the Future Ticket", category: "Adventure", cost: 3800, duration: "2.5 Hours", preferredTime: "09:30 AM", fixedSlot: true, description: "Futuristic exhibition space exploring science, tech, and space travel." },
            { id: "dubai-desert-safari", cityId: "dubai", name: "Desert Safari & Dune Bashing", category: "Adventure", cost: 2800, duration: "5.0 Hours", preferredTime: "03:00 PM", fixedSlot: true, description: "4x4 dune bashing, camel riding, belly dance performance, and BBQ dinner." }
        ]
    },
    {
        id: "tokyo",
        name: "Tokyo",
        state: "Kantō",
        country: "Japan",
        region: "East Asia",
        costIndex: "High",
        popularity: "🔥🔥🔥🔥🔥",
        activitiesCount: 6,
        activities: [
            { id: "tokyo-skytree", cityId: "tokyo", name: "Tokyo Skytree Observation Deck", category: "Sightseeing", cost: 2100, duration: "2.0 Hours", preferredTime: "04:30 PM", fixedSlot: true, description: "Tallest structure in Japan with 360-degree observation deck at sunset." },
            { id: "tokyo-shibuya-crossing", cityId: "tokyo", name: "Shibuya Crossing & Hachiko", category: "Sightseeing", cost: 0, duration: "1.5 Hours", preferredTime: "07:00 PM", fixedSlot: true, description: "World's busiest pedestrian scramble crossing in evening neon lights." },
            { id: "tokyo-sensoji", cityId: "tokyo", name: "Senso-ji Temple & Nakamise Walk", category: "Heritage & Monuments", cost: 0, duration: "2.5 Hours", preferredTime: "09:30 AM", fixedSlot: false, description: "Tokyo's oldest ancient Buddhist temple in Asakusa." },
            { id: "tokyo-meiji-shrine", cityId: "tokyo", name: "Meiji Shrine Forest Walk", category: "Heritage & Monuments", cost: 0, duration: "2.0 Hours", preferredTime: "01:00 PM", fixedSlot: false, description: "Shinto shrine dedicated to Emperor Meiji surrounded by 170-acre forest." },
            { id: "tokyo-disneyland", cityId: "tokyo", name: "Tokyo Disneyland 1-Day Pass", category: "Adventure", cost: 5500, duration: "8.0 Hours", preferredTime: "08:30 AM", fixedSlot: true, description: "First Disney park outside the US featuring 7 themed lands." },
            { id: "tokyo-tsukiji", cityId: "tokyo", name: "Tsukiji Outer Market Food Tour", category: "Food Walk", cost: 1800, duration: "2.5 Hours", preferredTime: "08:00 AM", fixedSlot: true, description: "Sample fresh morning sushi, wagyu skewers, tamagoyaki, and matcha." }
        ]
    },
    {
        id: "singapore",
        name: "Singapore",
        state: "Singapore",
        country: "Singapore",
        region: "Southeast Asia",
        costIndex: "High",
        popularity: "🔥🔥🔥🔥🔥",
        activitiesCount: 6,
        activities: [
            { id: "singapore-mbs-skypark", cityId: "singapore", name: "Marina Bay Sands Skypark Deck", category: "Sightseeing", cost: 2200, duration: "2.0 Hours", preferredTime: "05:00 PM", fixedSlot: true, description: "Observation deck sitting 57 levels above Singapore for sunset." },
            { id: "singapore-gardens-by-the-bay", cityId: "singapore", name: "Gardens by the Bay Supertree Grove", category: "Sightseeing", cost: 1800, duration: "3.0 Hours", preferredTime: "07:30 PM", fixedSlot: true, description: "Futuristic botanical park with evening Garden Rhapsody Light & Sound show." },
            { id: "singapore-sentosa", cityId: "singapore", name: "Sentosa Island Cable Car Ride", category: "Adventure", cost: 2400, duration: "4.0 Hours", preferredTime: "10:00 AM", fixedSlot: false, description: "Resort island featuring beaches, fort Siloso, and cable car aerial views." },
            { id: "singapore-universal-studios", cityId: "singapore", name: "Universal Studios Singapore Pass", category: "Adventure", cost: 5200, duration: "7.0 Hours", preferredTime: "09:30 AM", fixedSlot: true, description: "Theme park featuring Transformers, Battlestar Galactica, and Jurassic Park." },
            { id: "singapore-merlion", cityId: "singapore", name: "Merlion Park Waterfront Walk", category: "Sightseeing", cost: 0, duration: "1.0 Hour", preferredTime: "03:00 PM", fixedSlot: false, description: "Iconic half-lion, half-fish spouting statue facing Marina Bay." },
            { id: "singapore-night-safari", cityId: "singapore", name: "Singapore Zoo Night Safari", category: "Adventure", cost: 3100, duration: "3.5 Hours", preferredTime: "07:15 PM", fixedSlot: true, description: "World's first nocturnal wildlife park with open-air tram ride." }
        ]
    }
];

// Helper functions for local querying
function getCityById(cityId) {
    if (!cityId) return null;
    const strId = String(cityId).toLowerCase();
    return GLOBETROTTER_CITIES.find(c => String(c.id).toLowerCase() === strId || c.name.toLowerCase() === strId) || null;
}

function getActivitiesByCityId(cityId) {
    const city = getCityById(cityId);
    return city ? city.activities : [];
}

function searchCities(query = '', costFilter = '') {
    const q = query.trim().toLowerCase();
    return GLOBETROTTER_CITIES.filter(c => {
        const matchesQuery = !q || c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q) || c.country.toLowerCase().includes(q);
        const matchesCost = !costFilter || c.costIndex.toLowerCase() === costFilter.toLowerCase();
        return matchesQuery && matchesCost;
    });
}

// ---------------------------------------------------------------------------
// REAL DJANGO API FETCH CLIENT (Margish API Integration Section §4)
// ---------------------------------------------------------------------------

async function fetchCitiesFromAPI(query = '', costFilter = '') {
    try {
        let url = `/api/travel/cities/?q=${encodeURIComponent(query)}`;
        if (costFilter) {
            url += `&min_cost=${encodeURIComponent(costFilter)}`;
        }
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data.ok && Array.isArray(data.results)) {
                return data.results.map(c => ({
                    id: String(c.id),
                    dbId: c.id,
                    name: c.name,
                    state: c.state || c.country || 'India',
                    country: c.country || 'India',
                    region: c.region || c.country || 'Destination',
                    costIndex: c.cost_label || (c.cost_index >= 4 ? 'High' : (c.cost_index <= 2 ? 'Low' : 'Medium')),
                    popularity: typeof c.popularity === 'number' ? `🔥 (${c.popularity})` : (c.popularity || '🔥🔥🔥🔥'),
                    activitiesCount: c.activity_count || c.activities_count || (c.activities ? c.activities.length : 0),
                    activities: c.activities || []
                }));
            }
        }
    } catch (err) {
        console.warn('[GlobeTrotter API] City search endpoint unavailable, using catalog fallback:', err);
    }
    return searchCities(query, costFilter);
}

async function fetchActivitiesFromAPI(cityId, searchQuery = '', categoryFilter = '', budgetFilter = '', windowFilter = '') {
    try {
        let url = `/api/travel/activities/?q=${encodeURIComponent(searchQuery)}`;
        
        if (cityId) {
            url += `&city=${encodeURIComponent(cityId)}`;
        }
        if (categoryFilter) {
            url += `&type=${encodeURIComponent(categoryFilter)}`;
        }
        if (budgetFilter === 'free') {
            url += `&max_cost=0`;
        } else if (budgetFilter === '500') {
            url += `&max_cost=500`;
        } else if (budgetFilter === '1500') {
            url += `&max_cost=1500`;
        }

        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data.ok && Array.isArray(data.results)) {
                let results = data.results.map(a => {
                    const costVal = parseFloat(a.cost || 0);
                    return {
                        id: String(a.id),
                        activityId: String(a.id),
                        cityId: String(a.city_id || cityId),
                        cityName: a.city_name || '',
                        name: a.name,
                        category: a.type_display || a.type || a.category || 'Sightseeing',
                        cost: costVal,
                        duration: a.duration_hours ? `${a.duration_hours} Hours` : (a.duration || '2.0 Hours'),
                        preferredTime: a.best_time || a.preferredTime || "09:00 AM",
                        fixedSlot: !!(a.fixed_slot || a.fixedSlot || a.best_time === 'Sunset' || a.best_time === 'Sunrise'),
                        description: a.description || ''
                    };
                });

                // STRICT CITY FILTERING GUARANTEE: Activities from other cities NEVER appear
                if (cityId) {
                    const normCityId = String(cityId).toLowerCase();
                    results = results.filter(act => {
                        const actCity = String(act.cityId).toLowerCase();
                        return actCity === normCityId || act.cityName.toLowerCase() === normCityId;
                    });
                }

                return results;
            }
        }
    } catch (err) {
        console.warn('[GlobeTrotter API] Activity search endpoint unavailable, using catalog fallback:', err);
    }

    // Fallback to local catalog with strict city filtering guarantee
    const cityObj = getCityById(cityId);
    let localActs = cityObj ? cityObj.activities : [];
    
    // Guaranteed city scope
    if (cityId) {
        localActs = localActs.filter(act => String(act.cityId).toLowerCase() === String(cityId).toLowerCase());
    }

    return localActs.filter(act => {
        const matchesCat = !categoryFilter || act.category === categoryFilter;
        const matchesSearch = !searchQuery || act.name.toLowerCase().includes(searchQuery.toLowerCase()) || act.description.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesBudget = true;
        if (budgetFilter === 'free') matchesBudget = act.cost === 0;
        else if (budgetFilter === '500') matchesBudget = act.cost <= 500;
        else if (budgetFilter === '1500') matchesBudget = act.cost <= 1500;

        return matchesCat && matchesSearch && matchesBudget;
    });
}
