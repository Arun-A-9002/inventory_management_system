import React, { useEffect, useState } from "react";
import { CheckCircle, Building, MapPin, User, Eye, EyeOff, ArrowRight, ArrowLeft, X } from "lucide-react";

/* ---------- Toast Notification Component ---------- */
const Toast = ({ message, type = "error", onClose }) => (
  <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border max-w-md ${
    type === "error" ? "bg-red-50 border-red-200 text-red-800" : "bg-green-50 border-green-200 text-green-800"
  }`}>
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0">
        {type === "error" ? (
          <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-red-600 text-sm font-bold">!</span>
          </div>
        ) : (
          <CheckCircle className="w-5 h-5 text-green-600" />
        )}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  </div>
);

/* ---------- Popup component ---------- */
const Popup = ({ type = "error", message = "", onClose }) => (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
      <div className="flex items-center justify-center mb-4">
        {type === "success" ? (
          <CheckCircle className="w-12 h-12 text-green-500" />
        ) : (
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-red-500 text-xl font-bold">!</span>
          </div>
        )}
      </div>
      <div className="text-center mb-6">
        <h3 className={`text-lg font-semibold mb-2 ${
          type === "success" ? "text-green-800" : "text-red-800"
        }`}>
          {type === "success" ? "Success!" : "Error"}
        </h3>
        <p className="text-slate-600 whitespace-pre-wrap">{String(message)}</p>
      </div>
      <button
        onClick={onClose}
        className={`w-full py-3 rounded-lg font-medium transition-colors ${
          type === "success" 
            ? "bg-green-500 hover:bg-green-600 text-white" 
            : "bg-red-500 hover:bg-red-600 text-white"
        }`}
      >
        Close
      </button>
    </div>
  </div>
);

/* ---------- Helper validators ---------- */
const validators = {
  required: (v) => v?.trim() !== "",
  pincode: (v) => /^\d{6}$/.test(v),
  phone: (v) => /^\d{10}$/.test(v),
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.endsWith(".com"),
  password: (v) =>
    /[A-Z]/.test(v) &&
    /[a-z]/.test(v) &&
    /\d/.test(v) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(v),
  city: (v) => v?.trim() !== "",
  state: (v) => v?.trim() !== "",
  country: (v) => v?.trim() !== "",
};

const COUNTRIES_DATA = {
  "India": {
    "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Rajahmundry", "Tirupati", "Kadapa", "Anantapur", "Eluru"],
    "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Tezpur", "Bomdila", "Ziro", "Along", "Tezu", "Changlang", "Khonsa"],
    "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tinsukia", "Tezpur", "Bongaigaon", "Karimganj", "Sivasagar"],
    "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga", "Bihar Sharif", "Arrah", "Begusarai", "Katihar"],
    "Chhattisgarh": ["Raipur", "Bhilai", "Korba", "Bilaspur", "Durg", "Rajnandgaon", "Jagdalpur", "Raigarh", "Ambikapur", "Mahasamund"],
    "Goa": ["Panaji", "Vasco da Gama", "Margao", "Mapusa", "Ponda", "Bicholim", "Curchorem", "Sanquelim", "Cuncolim", "Quepem"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh", "Gandhinagar", "Anand", "Navsari"],
    "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar", "Karnal", "Sonipat", "Panchkula"],
    "Himachal Pradesh": ["Shimla", "Dharamshala", "Solan", "Mandi", "Palampur", "Baddi", "Nahan", "Kullu", "Hamirpur", "Una"],
    "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar", "Phusro", "Hazaribagh", "Giridih", "Ramgarh", "Medininagar"],
    "Karnataka": ["Bangalore", "Mysore", "Hubli", "Mangalore", "Belgaum", "Gulbarga", "Davanagere", "Bellary", "Bijapur", "Shimoga"],
    "Kerala": ["Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur", "Kollam", "Palakkad", "Alappuzha", "Malappuram", "Kannur", "Kasaragod"],
    "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain", "Sagar", "Dewas", "Satna", "Ratlam", "Rewa"],
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad", "Solapur", "Amravati", "Kolhapur", "Sangli"],
    "Manipur": ["Imphal", "Thoubal", "Bishnupur", "Churachandpur", "Kakching", "Ukhrul", "Senapati", "Tamenglong", "Jiribam", "Pherzawl"],
    "Meghalaya": ["Shillong", "Tura", "Jowai", "Nongpoh", "Baghmara", "Williamnagar", "Nongstoin", "Mawkyrwat", "Resubelpara", "Ampati"],
    "Mizoram": ["Aizawl", "Lunglei", "Saiha", "Champhai", "Kolasib", "Serchhip", "Lawngtlai", "Mamit", "Hnahthial", "Saitual"],
    "Nagaland": ["Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha", "Zunheboto", "Phek", "Kiphire", "Longleng", "Peren"],
    "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore", "Bhadrak", "Baripada", "Jharsuguda"],
    "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Firozpur", "Batala", "Pathankot", "Moga"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner", "Ajmer", "Bhilwara", "Alwar", "Bharatpur", "Sikar"],
    "Sikkim": ["Gangtok", "Namchi", "Geyzing", "Mangan", "Jorethang", "Nayabazar", "Rangpo", "Singtam", "Pakyong", "Ravangla"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Tiruppur", "Erode", "Vellore", "Thoothukudi"],
    "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Khammam", "Karimnagar", "Ramagundam", "Mahbubnagar", "Nalgonda", "Adilabad", "Suryapet"],
    "Tripura": ["Agartala", "Dharmanagar", "Udaipur", "Kailasahar", "Belonia", "Khowai", "Pratapgarh", "Ranir Bazar", "Sonamura", "Amarpur"],
    "Uttar Pradesh": ["Lucknow", "Kanpur", "Ghaziabad", "Agra", "Varanasi", "Meerut", "Allahabad", "Bareilly", "Aligarh", "Moradabad"],
    "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur", "Kashipur", "Rishikesh", "Kotdwar", "Ramnagar", "Manglaur"],
    "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Malda", "Bardhaman", "Kharagpur", "Haldia", "Raiganj"],
    "Delhi": ["New Delhi", "Delhi", "Dwarka", "Rohini", "Janakpuri", "Lajpat Nagar", "Karol Bagh", "Connaught Place", "Saket", "Vasant Kunj"],
    "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla", "Sopore", "Kathua", "Udhampur", "Punch", "Rajouri", "Kupwara"],
    "Ladakh": ["Leh", "Kargil", "Nubra", "Zanskar", "Drass", "Khaltse", "Nyoma", "Durbuk", "Khalatse", "Sankoo"]
  },
  "United States": {
    "Alabama": ["Birmingham", "Montgomery", "Mobile", "Huntsville", "Tuscaloosa", "Hoover", "Dothan", "Auburn", "Decatur", "Madison"],
    "Alaska": ["Anchorage", "Fairbanks", "Juneau", "Sitka", "Ketchikan", "Wasilla", "Kenai", "Kodiak", "Bethel", "Palmer"],
    "Arizona": ["Phoenix", "Tucson", "Mesa", "Chandler", "Scottsdale", "Glendale", "Gilbert", "Tempe", "Peoria", "Surprise"],
    "Arkansas": ["Little Rock", "Fort Smith", "Fayetteville", "Springdale", "Jonesboro", "North Little Rock", "Conway", "Rogers", "Pine Bluff", "Bentonville"],
    "California": ["Los Angeles", "San Francisco", "San Diego", "San Jose", "Fresno", "Sacramento", "Long Beach", "Oakland", "Bakersfield", "Anaheim"],
    "Colorado": ["Denver", "Colorado Springs", "Aurora", "Fort Collins", "Lakewood", "Thornton", "Arvada", "Westminster", "Pueblo", "Centennial"],
    "Connecticut": ["Bridgeport", "New Haven", "Hartford", "Stamford", "Waterbury", "Norwalk", "Danbury", "New Britain", "West Hartford", "Greenwich"],
    "Delaware": ["Wilmington", "Dover", "Newark", "Middletown", "Smyrna", "Milford", "Seaford", "Georgetown", "Elsmere", "New Castle"],
    "Florida": ["Jacksonville", "Miami", "Tampa", "Orlando", "St. Petersburg", "Hialeah", "Tallahassee", "Fort Lauderdale", "Port St. Lucie", "Cape Coral"],
    "Georgia": ["Atlanta", "Augusta", "Columbus", "Macon", "Savannah", "Athens", "Sandy Springs", "Roswell", "Johns Creek", "Albany"],
    "Hawaii": ["Honolulu", "Pearl City", "Hilo", "Kailua", "Waipahu", "Kaneohe", "Mililani Town", "Kahului", "Ewa Gentry", "Mililani Mauka"],
    "Idaho": ["Boise", "Meridian", "Nampa", "Idaho Falls", "Pocatello", "Caldwell", "Coeur d'Alene", "Twin Falls", "Lewiston", "Post Falls"],
    "Illinois": ["Chicago", "Aurora", "Rockford", "Joliet", "Naperville", "Springfield", "Peoria", "Elgin", "Waukegan", "Cicero"],
    "Indiana": ["Indianapolis", "Fort Wayne", "Evansville", "South Bend", "Carmel", "Fishers", "Bloomington", "Hammond", "Gary", "Muncie"],
    "Iowa": ["Des Moines", "Cedar Rapids", "Davenport", "Sioux City", "Waterloo", "Iowa City", "Council Bluffs", "Ames", "Dubuque", "West Des Moines"],
    "Kansas": ["Wichita", "Overland Park", "Kansas City", "Topeka", "Olathe", "Lawrence", "Shawnee", "Manhattan", "Lenexa", "Salina"],
    "Kentucky": ["Louisville", "Lexington", "Bowling Green", "Owensboro", "Covington", "Richmond", "Georgetown", "Florence", "Hopkinsville", "Nicholasville"],
    "Louisiana": ["New Orleans", "Baton Rouge", "Shreveport", "Lafayette", "Lake Charles", "Kenner", "Bossier City", "Monroe", "Alexandria", "Houma"],
    "Maine": ["Portland", "Lewiston", "Bangor", "South Portland", "Auburn", "Biddeford", "Sanford", "Saco", "Augusta", "Westbrook"],
    "Maryland": ["Baltimore", "Frederick", "Rockville", "Gaithersburg", "Bowie", "Hagerstown", "Annapolis", "College Park", "Salisbury", "Laurel"],
    "Massachusetts": ["Boston", "Worcester", "Springfield", "Lowell", "Cambridge", "New Bedford", "Brockton", "Quincy", "Lynn", "Fall River"],
    "Michigan": ["Detroit", "Grand Rapids", "Warren", "Sterling Heights", "Lansing", "Ann Arbor", "Flint", "Dearborn", "Livonia", "Westland"],
    "Minnesota": ["Minneapolis", "Saint Paul", "Rochester", "Duluth", "Bloomington", "Brooklyn Park", "Plymouth", "Saint Cloud", "Eagan", "Woodbury"],
    "Mississippi": ["Jackson", "Gulfport", "Southaven", "Hattiesburg", "Biloxi", "Meridian", "Tupelo", "Greenville", "Olive Branch", "Horn Lake"],
    "Missouri": ["Kansas City", "Saint Louis", "Springfield", "Independence", "Columbia", "Lee's Summit", "O'Fallon", "St. Joseph", "St. Charles", "St. Peters"],
    "Montana": ["Billings", "Missoula", "Great Falls", "Bozeman", "Butte", "Helena", "Kalispell", "Havre", "Anaconda", "Miles City"],
    "Nebraska": ["Omaha", "Lincoln", "Bellevue", "Grand Island", "Kearney", "Fremont", "Hastings", "North Platte", "Norfolk", "Columbus"],
    "Nevada": ["Las Vegas", "Henderson", "Reno", "North Las Vegas", "Sparks", "Carson City", "Fernley", "Elko", "Mesquite", "Boulder City"],
    "New Hampshire": ["Manchester", "Nashua", "Concord", "Derry", "Dover", "Rochester", "Salem", "Merrimack", "Hudson", "Londonderry"],
    "New Jersey": ["Newark", "Jersey City", "Paterson", "Elizabeth", "Edison", "Woodbridge", "Lakewood", "Toms River", "Hamilton", "Trenton"],
    "New Mexico": ["Albuquerque", "Las Cruces", "Rio Rancho", "Santa Fe", "Roswell", "Farmington", "Clovis", "Hobbs", "Alamogordo", "Carlsbad"],
    "New York": ["New York City", "Buffalo", "Rochester", "Yonkers", "Syracuse", "Albany", "New Rochelle", "Mount Vernon", "Schenectady", "Utica"],
    "North Carolina": ["Charlotte", "Raleigh", "Greensboro", "Durham", "Winston-Salem", "Fayetteville", "Cary", "Wilmington", "High Point", "Concord"],
    "North Dakota": ["Fargo", "Bismarck", "Grand Forks", "Minot", "West Fargo", "Williston", "Dickinson", "Mandan", "Jamestown", "Wahpeton"],
    "Ohio": ["Columbus", "Cleveland", "Cincinnati", "Toledo", "Akron", "Dayton", "Parma", "Canton", "Youngstown", "Lorain"],
    "Oklahoma": ["Oklahoma City", "Tulsa", "Norman", "Broken Arrow", "Lawton", "Edmond", "Moore", "Midwest City", "Enid", "Stillwater"],
    "Oregon": ["Portland", "Eugene", "Salem", "Gresham", "Hillsboro", "Bend", "Beaverton", "Medford", "Springfield", "Corvallis"],
    "Pennsylvania": ["Philadelphia", "Pittsburgh", "Allentown", "Erie", "Reading", "Scranton", "Bethlehem", "Lancaster", "Harrisburg", "Altoona"],
    "Rhode Island": ["Providence", "Warwick", "Cranston", "Pawtucket", "East Providence", "Woonsocket", "Newport", "Central Falls", "Westerly", "North Providence"],
    "South Carolina": ["Charleston", "Columbia", "North Charleston", "Mount Pleasant", "Rock Hill", "Greenville", "Summerville", "Sumter", "Goose Creek", "Hilton Head Island"],
    "South Dakota": ["Sioux Falls", "Rapid City", "Aberdeen", "Brookings", "Watertown", "Mitchell", "Yankton", "Pierre", "Huron", "Spearfish"],
    "Tennessee": ["Nashville", "Memphis", "Knoxville", "Chattanooga", "Clarksville", "Murfreesboro", "Franklin", "Johnson City", "Bartlett", "Hendersonville"],
    "Texas": ["Houston", "San Antonio", "Dallas", "Austin", "Fort Worth", "El Paso", "Arlington", "Corpus Christi", "Plano", "Lubbock"],
    "Utah": ["Salt Lake City", "West Valley City", "Provo", "West Jordan", "Orem", "Sandy", "Ogden", "St. George", "Layton", "Taylorsville"],
    "Vermont": ["Burlington", "Essex", "South Burlington", "Colchester", "Rutland", "Bennington", "Brattleboro", "Milton", "Hartford", "Barre"],
    "Virginia": ["Virginia Beach", "Norfolk", "Chesapeake", "Richmond", "Newport News", "Alexandria", "Hampton", "Portsmouth", "Suffolk", "Roanoke"],
    "Washington": ["Seattle", "Spokane", "Tacoma", "Vancouver", "Bellevue", "Kent", "Everett", "Renton", "Yakima", "Federal Way"],
    "West Virginia": ["Charleston", "Huntington", "Parkersburg", "Morgantown", "Wheeling", "Martinsburg", "Fairmont", "Beckley", "Clarksburg", "Lewisburg"],
    "Wisconsin": ["Milwaukee", "Madison", "Green Bay", "Kenosha", "Racine", "Appleton", "Waukesha", "Eau Claire", "Oshkosh", "Janesville"],
    "Wyoming": ["Cheyenne", "Casper", "Laramie", "Gillette", "Rock Springs", "Sheridan", "Green River", "Evanston", "Riverton", "Jackson"]
  },
  "United Kingdom": {
    "England": ["London", "Birmingham", "Manchester", "Liverpool", "Leeds", "Sheffield", "Bristol", "Newcastle", "Nottingham", "Leicester"],
    "Scotland": ["Glasgow", "Edinburgh", "Aberdeen", "Dundee", "Stirling", "Perth", "Inverness", "Paisley", "East Kilbride", "Hamilton"],
    "Wales": ["Cardiff", "Swansea", "Newport", "Wrexham", "Barry", "Caerphilly", "Bridgend", "Neath", "Port Talbot", "Cwmbran"],
    "Northern Ireland": ["Belfast", "Derry", "Lisburn", "Newtownabbey", "Bangor", "Craigavon", "Castlereagh", "Ballymena", "Newtownards", "Carrickfergus"]
  },
  "Canada": {
    "Alberta": ["Calgary", "Edmonton", "Red Deer", "Lethbridge", "St. Albert", "Medicine Hat", "Grande Prairie", "Airdrie", "Spruce Grove", "Okotoks"],
    "British Columbia": ["Vancouver", "Victoria", "Surrey", "Burnaby", "Richmond", "Abbotsford", "Coquitlam", "Kelowna", "Saanich", "Langley"],
    "Manitoba": ["Winnipeg", "Brandon", "Steinbach", "Thompson", "Portage la Prairie", "Winkler", "Selkirk", "Morden", "Dauphin", "The Pas"],
    "New Brunswick": ["Saint John", "Moncton", "Fredericton", "Dieppe", "Riverview", "Edmundston", "Miramichi", "Campbellton", "Bathurst", "Sackville"],
    "Newfoundland and Labrador": ["St. John's", "Mount Pearl", "Corner Brook", "Conception Bay South", "Grand Falls-Windsor", "Paradise", "Happy Valley-Goose Bay", "Gander", "Labrador City", "Stephenville"],
    "Northwest Territories": ["Yellowknife", "Hay River", "Inuvik", "Fort Smith", "Behchoko", "Iqaluit", "Norman Wells", "Fort Simpson", "Tuktoyaktuk", "Aklavik"],
    "Nova Scotia": ["Halifax", "Sydney", "Dartmouth", "Truro", "New Glasgow", "Glace Bay", "Kentville", "Amherst", "Yarmouth", "Bridgewater"],
    "Nunavut": ["Iqaluit", "Rankin Inlet", "Arviat", "Baker Lake", "Igloolik", "Pangnirtung", "Pond Inlet", "Kugluktuk", "Cape Dorset", "Gjoa Haven"],
    "Ontario": ["Toronto", "Ottawa", "Hamilton", "London", "Kitchener", "Windsor", "Oshawa", "Barrie", "Kingston", "Guelph"],
    "Prince Edward Island": ["Charlottetown", "Summerside", "Stratford", "Cornwall", "Montague", "Kensington", "Souris", "Alberton", "Georgetown", "Tignish"],
    "Quebec": ["Montreal", "Quebec City", "Laval", "Gatineau", "Longueuil", "Sherbrooke", "Saguenay", "Trois-Rivières", "Terrebonne", "Saint-Jean-sur-Richelieu"],
    "Saskatchewan": ["Saskatoon", "Regina", "Prince Albert", "Moose Jaw", "Swift Current", "Yorkton", "North Battleford", "Estevan", "Weyburn", "Lloydminster"],
    "Yukon": ["Whitehorse", "Dawson City", "Watson Lake", "Haines Junction", "Mayo", "Carmacks", "Faro", "Ross River", "Teslin", "Old Crow"]
  },
  "Australia": {
    "New South Wales": ["Sydney", "Newcastle", "Wollongong", "Maitland", "Wagga Wagga", "Albury", "Port Macquarie", "Tamworth", "Orange", "Dubbo"],
    "Victoria": ["Melbourne", "Geelong", "Ballarat", "Bendigo", "Frankston", "Mildura", "Shepparton", "Wodonga", "Warrnambool", "Traralgon"],
    "Queensland": ["Brisbane", "Gold Coast", "Townsville", "Cairns", "Toowoomba", "Rockhampton", "Mackay", "Bundaberg", "Hervey Bay", "Gladstone"],
    "Western Australia": ["Perth", "Fremantle", "Rockingham", "Mandurah", "Bunbury", "Kalgoorlie", "Geraldton", "Albany", "Kwinana", "Broome"],
    "South Australia": ["Adelaide", "Mount Gambier", "Whyalla", "Murray Bridge", "Port Lincoln", "Port Pirie", "Victor Harbor", "Kadina", "Gawler", "Port Augusta"],
    "Tasmania": ["Hobart", "Launceston", "Devonport", "Burnie", "Ulverstone", "Kingston", "Sorell", "Glenorchy", "Clarence", "Brighton"],
    "Northern Territory": ["Darwin", "Alice Springs", "Palmerston", "Katherine", "Nhulunbuy", "Tennant Creek", "Casuarina", "Marrara", "Tiwi", "Litchfield"],
    "Australian Capital Territory": ["Canberra", "Gungahlin", "Tuggeranong", "Weston Creek", "Belconnen", "Woden Valley", "Molonglo Valley", "Jerrabomberra", "Hall", "Oaks Estate"]
  },
  "Germany": {
    "Baden-Württemberg": ["Stuttgart", "Mannheim", "Karlsruhe", "Freiburg", "Heidelberg", "Heilbronn", "Ulm", "Pforzheim", "Reutlingen", "Esslingen"],
    "Bavaria": ["Munich", "Nuremberg", "Augsburg", "Würzburg", "Regensburg", "Ingolstadt", "Fürth", "Erlangen", "Bayreuth", "Bamberg"],
    "Berlin": ["Berlin", "Charlottenburg", "Kreuzberg", "Prenzlauer Berg", "Friedrichshain", "Mitte", "Neukölln", "Tempelhof", "Schöneberg", "Wedding"],
    "Brandenburg": ["Potsdam", "Cottbus", "Brandenburg", "Frankfurt (Oder)", "Oranienburg", "Falkensee", "Bernau", "Schwedt", "Eberswalde", "Neuruppin"],
    "Bremen": ["Bremen", "Bremerhaven", "Vegesack", "Blumenthal", "Burglesum", "Borgfeld", "Oberneuland", "Huchting", "Woltmershausen", "Grolland"],
    "Hamburg": ["Hamburg", "Altona", "Eimsbüttel", "Hamburg-Nord", "Wandsbek", "Bergedorf", "Harburg", "Hamburg-Mitte", "Blankenese", "Winterhude"],
    "Hesse": ["Frankfurt", "Wiesbaden", "Kassel", "Darmstadt", "Offenbach", "Hanau", "Marburg", "Fulda", "Rüsselsheim", "Gießen"],
    "Lower Saxony": ["Hanover", "Braunschweig", "Oldenburg", "Osnabrück", "Wolfsburg", "Göttingen", "Salzgitter", "Hildesheim", "Delmenhorst", "Wilhelmshaven"],
    "Mecklenburg-Vorpommern": ["Rostock", "Schwerin", "Neubrandenburg", "Stralsund", "Greifswald", "Wismar", "Güstrow", "Waren", "Parchim", "Ribnitz-Damgarten"],
    "North Rhine-Westphalia": ["Cologne", "Düsseldorf", "Dortmund", "Essen", "Duisburg", "Bochum", "Wuppertal", "Bielefeld", "Bonn", "Münster"],
    "Rhineland-Palatinate": ["Mainz", "Ludwigshafen", "Koblenz", "Trier", "Kaiserslautern", "Worms", "Neuwied", "Speyer", "Frankenthal", "Bad Kreuznach"],
    "Saarland": ["Saarbrücken", "Neunkirchen", "Homburg", "Völklingen", "Sankt Ingbert", "Merzig", "Sankt Wendel", "Blieskastel", "Dillingen", "Lebach"],
    "Saxony": ["Dresden", "Leipzig", "Chemnitz", "Zwickau", "Plauen", "Görlitz", "Freiberg", "Bautzen", "Freital", "Pirna"],
    "Saxony-Anhalt": ["Magdeburg", "Halle", "Dessau-Roßlau", "Wittenberg", "Stendal", "Weißenfels", "Merseburg", "Bernburg", "Naumburg", "Quedlinburg"],
    "Schleswig-Holstein": ["Kiel", "Lübeck", "Flensburg", "Neumünster", "Norderstedt", "Elmshorn", "Pinneberg", "Wedel", "Ahrensburg", "Geesthacht"],
    "Thuringia": ["Erfurt", "Jena", "Gera", "Weimar", "Gotha", "Nordhausen", "Eisenach", "Suhl", "Mühlhausen", "Altenburg"]
  },
  "France": {
    "Île-de-France": ["Paris", "Boulogne-Billancourt", "Saint-Denis", "Argenteuil", "Montreuil", "Créteil", "Nanterre", "Colombes", "Aulnay-sous-Bois", "Rueil-Malmaison"],
    "Auvergne-Rhône-Alpes": ["Lyon", "Grenoble", "Saint-Étienne", "Villeurbanne", "Clermont-Ferrand", "Valence", "Chambéry", "Annecy", "Bourg-en-Bresse", "Roanne"],
    "Nouvelle-Aquitaine": ["Bordeaux", "Limoges", "Poitiers", "Pau", "La Rochelle", "Mérignac", "Pessac", "Bayonne", "Angoulême", "Niort"],
    "Occitanie": ["Toulouse", "Montpellier", "Nîmes", "Perpignan", "Béziers", "Narbonne", "Carcassonne", "Albi", "Tarbes", "Castres"],
    "Hauts-de-France": ["Lille", "Amiens", "Tourcoing", "Roubaix", "Dunkerque", "Calais", "Villeneuve-d'Ascq", "Saint-Quentin", "Beauvais", "Compiègne"],
    "Grand Est": ["Strasbourg", "Reims", "Metz", "Nancy", "Mulhouse", "Troyes", "Colmar", "Charleville-Mézières", "Thionville", "Épinal"],
    "Provence-Alpes-Côte d'Azur": ["Marseille", "Nice", "Toulon", "Aix-en-Provence", "Antibes", "Cannes", "Avignon", "Fréjus", "Arles", "Gap"],
    "Pays de la Loire": ["Nantes", "Angers", "Le Mans", "Saint-Nazaire", "Cholet", "La Roche-sur-Yon", "Laval", "Rezé", "Saint-Sébastien-sur-Loire", "Saumur"],
    "Bretagne": ["Rennes", "Brest", "Quimper", "Lorient", "Vannes", "Saint-Malo", "Saint-Brieuc", "Lanester", "Fougères", "Lannion"],
    "Normandie": ["Le Havre", "Rouen", "Caen", "Cherbourg-en-Cotentin", "Évreux", "Dieppe", "Sotteville-lès-Rouen", "Saint-Étienne-du-Rouvray", "Tourlaville", "Alençon"],
    "Centre-Val de Loire": ["Orléans", "Tours", "Bourges", "Blois", "Chartres", "Châteauroux", "Joué-lès-Tours", "Dreux", "Vierzon", "Fleury-les-Aubrais"],
    "Bourgogne-Franche-Comté": ["Dijon", "Besançon", "Belfort", "Chalon-sur-Saône", "Nevers", "Auxerre", "Mâcon", "Dole", "Le Creusot", "Montbéliard"],
    "Corse": ["Ajaccio", "Bastia", "Porto-Vecchio", "Corte", "Bonifacio", "Calvi", "Propriano", "Sartène", "Ghisonaccia", "Saint-Florent"]
  },
  "Japan": {
    "Tokyo": ["Tokyo", "Shibuya", "Shinjuku", "Harajuku", "Ginza", "Akihabara", "Roppongi", "Asakusa", "Ikebukuro", "Ueno"],
    "Osaka": ["Osaka", "Sakai", "Higashiosaka", "Hirakata", "Toyonaka", "Suita", "Takatsuki", "Yao", "Neyagawa", "Kishiwada"],
    "Kanagawa": ["Yokohama", "Kawasaki", "Sagamihara", "Fujisawa", "Chigasaki", "Hiratsuka", "Machida", "Odawara", "Yamato", "Zushi"],
    "Aichi": ["Nagoya", "Toyota", "Okazaki", "Ichinomiya", "Kasugai", "Anjo", "Toyohashi", "Nishio", "Kariya", "Komaki"],
    "Saitama": ["Saitama", "Kawaguchi", "Kawagoe", "Tokorozawa", "Koshigaya", "Soka", "Ageo", "Kasukabe", "Kumagaya", "Iruma"],
    "Hyogo": ["Kobe", "Himeji", "Nishinomiya", "Amagasaki", "Akashi", "Kakogawa", "Takarazuka", "Itami", "Kawanishi", "Sanda"],
    "Hokkaido": ["Sapporo", "Asahikawa", "Hakodate", "Kushiro", "Tomakomai", "Obihiro", "Otaru", "Kitami", "Ebetsu", "Muroran"],
    "Fukuoka": ["Fukuoka", "Kitakyushu", "Kurume", "Omuta", "Iizuka", "Kasuga", "Onojo", "Munakata", "Chikushino", "Dazaifu"],
    "Shizuoka": ["Shizuoka", "Hamamatsu", "Numazu", "Fuji", "Fujinomiya", "Yaizu", "Mishima", "Kakegawa", "Atami", "Gotemba"],
    "Hiroshima": ["Hiroshima", "Fukuyama", "Kure", "Higashihiroshima", "Onomichi", "Mihara", "Fuchu", "Akitakata", "Hatsukaichi", "Takehara"]
  },
  "Brazil": {
    "São Paulo": ["São Paulo", "Guarulhos", "Campinas", "São Bernardo do Campo", "Santo André", "Osasco", "Ribeirão Preto", "Sorocaba", "Mauá", "São José dos Campos"],
    "Rio de Janeiro": ["Rio de Janeiro", "São Gonçalo", "Duque de Caxias", "Nova Iguaçu", "Niterói", "Belford Roxo", "São João de Meriti", "Campos dos Goytacazes", "Petrópolis", "Volta Redonda"],
    "Minas Gerais": ["Belo Horizonte", "Uberlândia", "Contagem", "Juiz de Fora", "Betim", "Montes Claros", "Ribeirão das Neves", "Uberaba", "Governador Valadares", "Ipatinga"],
    "Bahia": ["Salvador", "Feira de Santana", "Vitória da Conquista", "Camaçari", "Juazeiro", "Itabuna", "Lauro de Freitas", "Ilhéus", "Jequié", "Teixeira de Freitas"],
    "Paraná": ["Curitiba", "Londrina", "Maringá", "Ponta Grossa", "Cascavel", "São José dos Pinhais", "Foz do Iguaçu", "Colombo", "Guarapuava", "Paranaguá"],
    "Rio Grande do Sul": ["Porto Alegre", "Caxias do Sul", "Pelotas", "Canoas", "Santa Maria", "Gravataí", "Viamão", "Novo Hamburgo", "São Leopoldo", "Rio Grande"],
    "Pernambuco": ["Recife", "Jaboatão dos Guararapes", "Olinda", "Caruaru", "Petrolina", "Paulista", "Cabo de Santo Agostinho", "Camaragibe", "Garanhuns", "Vitória de Santo Antão"],
    "Ceará": ["Fortaleza", "Caucaia", "Juazeiro do Norte", "Maracanaú", "Sobral", "Crato", "Itapipoca", "Maranguape", "Iguatu", "Quixadá"],
    "Pará": ["Belém", "Ananindeua", "Santarém", "Marabá", "Parauapebas", "Castanhal", "Abaetetuba", "Cametá", "Marituba", "Bragança"],
    "Santa Catarina": ["Joinville", "Florianópolis", "Blumenau", "São José", "Criciúma", "Chapecó", "Itajaí", "Lages", "Jaraguá do Sul", "Palhoça"]
  }
};

export default function Register() {

  /* ---------- SECRET KEY PROTECTION ---------- */
  const SECRET_KEY = "9002";
  const [keyInput, setKeyInput] = useState("");
  const [verified, setVerified] = useState(false);

  const verifyKey = () => {
    if (keyInput === SECRET_KEY) {
      setVerified(true);
    } else {
      showToast("Invalid secret key. Access denied.");
    }
  };

  /* ---------- FORM DATA ---------- */
  const initial = {
    organization_name: "",
    organization_type: "",
    organization_license_number: "",
    organization_address: "",
    country: "India",
    city: "",
    state: "",
    pincode: "",
    contact_phone: "",
    contact_email: "",
    tenant_code: "",
    admin_name: "",
    admin_email: "",
    admin_phone: "",
    admin_secondary_phone: "",
    designation: "",
    status: "Active",
    password: "",
  };

  const [form, setForm] = useState(() => {
    try {
      const raw = localStorage.getItem("org_register_form");
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [popup, setPopup] = useState({ show: false, type: "error", message: "" });
  const [toast, setToast] = useState({ show: false, type: "error", message: "" });
  const [showPassword, setShowPassword] = useState(false);

  // Show toast notification
  const showToast = (message, type = "error") => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: "error", message: "" }), 5000);
  };

  useEffect(() => {
    try {
      localStorage.setItem("org_register_form", JSON.stringify(form));
    } catch {}
  }, [form]);

  const getPasswordStrength = (pw = form.password) => {
    if (!pw) return "";
    let score = 0;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pw)) score++;
    if (score >= 4 && pw.length >= 8) return "Strong";
    if (score >= 2 && pw.length >= 6) return "Medium";
    return "Weak";
  };

  /* ---------- INPUT HANDLING ---------- */
  const handleChange = (e) => {
    const name = e.target.name;
    let value = e.target.value;

    if (["contact_phone", "admin_phone", "admin_secondary_phone"].includes(name)) {
      value = value.replace(/\D/g, "").slice(0, 10);
    }
    if (name === "pincode") value = value.replace(/\D/g, "").slice(0, 6);

    if (name === "contact_email" || name === "admin_email")
      value = value.toLowerCase().trim();

    // Reset dependent fields when country changes
    if (name === "country") {
      setForm((prev) => ({ ...prev, [name]: value, state: "", city: "" }));
      return;
    }

    // Reset city when state changes
    if (name === "state") {
      setForm((prev) => ({ ...prev, [name]: value, city: "" }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const validateField = (name, value) => {
    let msg = "";

    if (!validators.required(value)) {
      msg = "This field is required";
      showToast(`${name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: This field is required`);
    } else {
      if (name === "pincode" && !validators.pincode(value)) {
        msg = "Pincode must be 6 digits";
        showToast("Pincode: Must be exactly 6 digits");
      }

      if (["contact_phone", "admin_phone", "admin_secondary_phone"].includes(name) && !validators.phone(value)) {
        msg = "Phone must be 10 digits";
        showToast(`${name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: Must be exactly 10 digits`);
      }

      if (["contact_email", "admin_email"].includes(name) && !validators.email(value)) {
        msg = "Invalid email format";
        showToast(`${name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: Must be a valid email ending with .com`);
      }

      if (name === "password" && !validators.password(value)) {
        msg = "Password must include uppercase, lowercase, number, and special character";
        showToast("Password: Must include uppercase letter, lowercase letter, number, and special character");
      }

      if (name === "country" && !validators.country(value)) {
        msg = "Please select a valid country";
        showToast("Country: Please select a country from the dropdown");
      }

      if (name === "city" && !validators.city(value)) {
        msg = "Please select a valid city";
        showToast("City: Please select a city from the dropdown");
      }

      if (name === "state" && !validators.state(value)) {
        msg = "Please select a valid state";
        showToast("State: Please select a state from the dropdown");
      }

      // Check tenant code availability
      if (name === "tenant_code" && value.trim()) {
        checkTenantCodeAvailability(value.trim());
      }
    }

    setErrors((prev) => ({ ...prev, [name]: msg }));
    return msg === "";
  };

  // Check if tenant code already exists
  const checkTenantCodeAvailability = async (tenantCode) => {
    try {
      const res = await fetch(`http://localhost:8000/api/check-tenant/${tenantCode}`);
      const data = await res.json();
      
      if (res.ok && data.exists) {
        showToast(`Tenant code "${tenantCode}" is already registered. Please choose a different code.`);
        setErrors((prev) => ({ ...prev, tenant_code: "This tenant code is already taken" }));
      }
    } catch (error) {
      console.log("Could not check tenant code availability");
    }
  };

  const validateStep = (current) => {
    const fields = [
      ["organization_name", "organization_type", "organization_license_number", "contact_phone", "contact_email"],
      ["organization_address", "country", "state", "city", "pincode"],
      ["admin_name", "admin_email", "admin_phone", "admin_secondary_phone", "designation", "status", "password", "tenant_code"],
    ][current];

    let ok = true;
    fields.forEach((f) => {
      if (!validateField(f, form[f])) ok = false;
    });

    return ok;
  };

  const goNext = () => {
    if (!validateStep(step)) {
      return;
    }
    setStep((s) => Math.min(2, s + 1));
  };

  const goBack = () => setStep((s) => Math.max(0, s - 1));

  /* ---------- SUBMIT ---------- */
  const handleFinalSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:8000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorText = await res.text();
        let errorData;
        
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { detail: errorText || "Unable to process registration request" };
        }
        
        // Handle specific error cases
        if (res.status === 400 && errorText.includes("Admin email already exists")) {
          showToast(`The admin email "${form.admin_email}" is already registered. Please use a different email address.`);
        } else if (res.status === 409 && errorText.includes("Tenant code already exists")) {
          showToast(`Tenant code "${form.tenant_code}" is already registered. Please choose a different code.`);
        } else if (errorData.detail) {
          showToast(errorData.detail);
        } else if (errorData.message) {
          showToast(errorData.message);
        } else {
          // Handle validation errors
          if (errorData.errors && Array.isArray(errorData.errors)) {
            const errorMessages = errorData.errors.map(err => err.msg || err.message).join(', ');
            showToast(errorMessages);
          } else {
            showToast("Please check your information and try again");
          }
        }
        return;
      }

      const emailStatus = data.email_sent ? 
        "\n\nA confirmation email has been sent to your admin email address." : 
        "\n\nNote: Confirmation email could not be sent, but registration was successful.";

      setPopup({
        show: true,
        type: "success",
        message: `Organization registered successfully!${emailStatus}`,
      });

      localStorage.removeItem("org_register_form");
    } catch (error) {
      console.error('Registration error:', error);
      setPopup({
        show: true,
        type: "error",
        message: "Unable to connect to the server. Please check your connection and try again.",
      });
    }
  };

  /* ---------- UI COMPONENTS ---------- */

  const StepHeader = () => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {[
            { icon: Building, label: "Company" },
            { icon: MapPin, label: "Address" },
            { icon: User, label: "Admin" }
          ].map((stepInfo, i) => {
            const Icon = stepInfo.icon;
            return (
              <div key={i} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${
                  step === i
                    ? "bg-slate-900 text-white"
                    : step > i
                    ? "bg-green-500 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}>
                  {step > i ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                {i < 2 && (
                  <div className={`w-12 h-0.5 mx-2 rounded-full transition-all ${
                    step > i ? "bg-green-500" : "bg-slate-200"
                  }`} />
                )}
              </div>
            );
          })}
        </div>
        <div className="text-xs font-medium text-slate-500">
          Step {step + 1} of 3
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">
          {[
            "Company Information",
            "Address Details", 
            "Administrator Setup"
          ][step]}
        </h2>
        <p className="text-slate-600 text-sm">
          {[
            "Tell us about your organization",
            "Where is your business located?",
            "Set up your admin account"
          ][step]}
        </p>
      </div>
    </div>
  );

  /* ---------- SECRET KEY SCREEN ---------- */
  if (!verified) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        {/* Toast Notification */}
        {toast.show && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast({ show: false, type: "error", message: "" })} 
          />
        )}

        {/* Left Panel - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative z-10 flex flex-col justify-center px-12 text-white">
            <div className="mb-8">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center mb-6">
                <span className="text-2xl font-bold">N</span>
              </div>
              <h1 className="text-4xl font-light mb-4">NUTRYAH</h1>
              <h2 className="text-xl text-blue-200 mb-6">Organization Registration</h2>
              <p className="text-slate-300 text-lg leading-relaxed max-w-md">
                Join our enterprise healthcare management platform and streamline your operations.
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel - Access Key */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-white">N</span>
              </div>
              <h1 className="text-2xl font-semibold text-slate-900">NUTRYAH</h1>
              <p className="text-slate-600 text-sm">Organization Registration</p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-2">Secure Access Required</h2>
              <p className="text-slate-600">Enter your authorization key to proceed with registration</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Authorization Key
                </label>
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="Enter access key"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  onKeyPress={(e) => e.key === 'Enter' && verifyKey()}
                />
              </div>

              <button
                onClick={verifyKey}
                className="w-full py-3 px-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors font-medium"
              >
                Verify Access
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 text-center">
              <p className="text-xs text-slate-500">
                © 2024 NUTRYAH. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- MAIN FORM UI ---------- */
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/3 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 flex flex-col justify-center px-8 text-white">
          <div className="mb-8">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center mb-6">
              <span className="text-2xl font-bold">N</span>
            </div>
            <h1 className="text-3xl font-light mb-4">NUTRYAH</h1>
            <h2 className="text-lg text-blue-200 mb-6">Organization Registration</h2>
            <p className="text-slate-300 leading-relaxed max-w-sm">
              Join our enterprise healthcare management platform and streamline your operations with advanced features.
            </p>
          </div>
          <div className="space-y-3 text-sm text-slate-400">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Multi-tenant Architecture</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Enterprise Security</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>24/7 Support</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Registration Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-2xl">
          {/* Toast Notification */}
          {toast.show && (
            <Toast 
              message={toast.message} 
              type={toast.type} 
              onClose={() => setToast({ show: false, type: "error", message: "" })} 
            />
          )}
          
          {popup.show && (
            <Popup type={popup.type} message={popup.message} onClose={() => setPopup({ show: false })} />
          )}

          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold text-white">N</span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">NUTRYAH</h1>
            <p className="text-slate-600 text-sm">Organization Registration</p>
          </div>

          <div className="mb-6">
            <StepHeader />
          </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <form onSubmit={handleFinalSubmit} className="space-y-6">

            {/* ---------------- STEP 1 ---------------- */}
            {step === 0 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Organization Name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Organization Name
                    </label>
                    <input
                      name="organization_name"
                      value={form.organization_name}
                      onChange={handleChange}
                      placeholder="Enter your organization name"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    {errors.organization_name && (
                      <p className="text-red-600 text-sm mt-1">{errors.organization_name}</p>
                    )}
                  </div>

                  {/* Organization Type */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Organization Type
                    </label>
                    <input
                      name="organization_type"
                      value={form.organization_type}
                      onChange={handleChange}
                      placeholder="e.g. Clinic, Hospital, Pharmacy"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    {errors.organization_type && (
                      <p className="text-red-600 text-sm mt-1">{errors.organization_type}</p>
                    )}
                  </div>

                  {/* License Number */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      License Number
                    </label>
                    <input
                      name="organization_license_number"
                      value={form.organization_license_number}
                      onChange={handleChange}
                      placeholder="Ex: LIC-12345"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    {errors.organization_license_number && (
                      <p className="text-red-600 text-sm mt-1">{errors.organization_license_number}</p>
                    )}
                  </div>

                  {/* Contact Phone */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Contact Phone
                    </label>
                    <input
                      name="contact_phone"
                      value={form.contact_phone}
                      onChange={handleChange}
                      placeholder="10-digit phone number"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    {errors.contact_phone && (
                      <p className="text-red-600 text-sm mt-1">{errors.contact_phone}</p>
                    )}
                  </div>

                  {/* Contact Email */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Contact Email
                    </label>
                    <input
                      name="contact_email"
                      value={form.contact_email}
                      onChange={handleChange}
                      placeholder="contact@company.com"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    {errors.contact_email && (
                      <p className="text-red-600 text-sm mt-1">{errors.contact_email}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <button 
                    type="button" 
                    onClick={goNext} 
                    className="py-3 px-6 bg-slate-900 text-white rounded-lg hover:bg-slate-800 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors font-medium flex items-center"
                  >
                    Next: Address Details
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ---------------- STEP 2 ---------------- */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Address */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Street Address
                    </label>
                    <input
                      name="organization_address"
                      value={form.organization_address}
                      onChange={handleChange}
                      placeholder="Street, Area, Building details"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    {errors.organization_address && (
                      <p className="text-red-600 text-sm mt-1">{errors.organization_address}</p>
                    )}
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Country
                    </label>
                    <select
                      name="country"
                      value={form.country}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      {Object.keys(COUNTRIES_DATA).map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                    {errors.country && (
                      <p className="text-red-600 text-sm mt-1">{errors.country}</p>
                    )}
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      State/Province
                    </label>
                    <select
                      name="state"
                      value={form.state}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="">Select state/province</option>
                      {form.country && COUNTRIES_DATA[form.country] && 
                        Object.keys(COUNTRIES_DATA[form.country]).map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))
                      }
                    </select>
                    {errors.state && (
                      <p className="text-red-600 text-sm mt-1">{errors.state}</p>
                    )}
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      City
                    </label>
                    <select
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="">Select city</option>
                      {form.country && form.state && COUNTRIES_DATA[form.country] && COUNTRIES_DATA[form.country][form.state] && 
                        COUNTRIES_DATA[form.country][form.state].map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))
                      }
                    </select>
                    {errors.city && (
                      <p className="text-red-600 text-sm mt-1">{errors.city}</p>
                    )}
                  </div>

                  {/* Pincode */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Pincode
                    </label>
                    <input
                      name="pincode"
                      value={form.pincode}
                      onChange={handleChange}
                      placeholder="6-digit pincode"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    {errors.pincode && (
                      <p className="text-red-600 text-sm mt-1">{errors.pincode}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between pt-6">
                  <button 
                    type="button" 
                    onClick={goBack} 
                    className="py-3 px-6 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium flex items-center"
                  >
                    <ArrowLeft className="mr-2 w-4 h-4" />
                    Back
                  </button>
                  <button 
                    type="button" 
                    onClick={goNext} 
                    className="py-3 px-6 bg-slate-900 text-white rounded-lg hover:bg-slate-800 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors font-medium flex items-center"
                  >
                    Next: Admin Setup
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ---------------- STEP 3 ---------------- */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Admin Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Administrator Name
                    </label>
                    <input
                      name="admin_name"
                      value={form.admin_name}
                      onChange={handleChange}
                      placeholder="Full name of administrator"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    {errors.admin_name && (
                      <p className="text-red-600 text-sm mt-1">{errors.admin_name}</p>
                    )}
                  </div>

                  {/* Designation */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Designation
                    </label>
                    <input
                      name="designation"
                      value={form.designation}
                      onChange={handleChange}
                      placeholder="Owner, Manager, Director"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    {errors.designation && (
                      <p className="text-red-600 text-sm mt-1">{errors.designation}</p>
                    )}
                  </div>

                  {/* Admin Phone */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Primary Phone
                    </label>
                    <input
                      name="admin_phone"
                      value={form.admin_phone}
                      onChange={handleChange}
                      placeholder="10-digit phone number"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    {errors.admin_phone && (
                      <p className="text-red-600 text-sm mt-1">{errors.admin_phone}</p>
                    )}
                  </div>

                  {/* Secondary Phone */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Secondary Phone
                    </label>
                    <input
                      name="admin_secondary_phone"
                      value={form.admin_secondary_phone}
                      onChange={handleChange}
                      placeholder="Backup phone number"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    {errors.admin_secondary_phone && (
                      <p className="text-red-600 text-sm mt-1">{errors.admin_secondary_phone}</p>
                    )}
                  </div>

                  {/* Admin Email */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Administrator Email
                    </label>
                    <input
                      name="admin_email"
                      value={form.admin_email}
                      onChange={handleChange}
                      placeholder="admin@company.com"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    {errors.admin_email && (
                      <p className="text-red-600 text-sm mt-1">{errors.admin_email}</p>
                    )}
                  </div>

                  {/* Contact Email */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Contact Email
                    </label>
                    <input
                      name="contact_email"
                      value={form.contact_email}
                      onChange={handleChange}
                      placeholder="contact@company.com"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    {errors.contact_email && (
                      <p className="text-red-600 text-sm mt-1">{errors.contact_email}</p>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Status
                    </label>
                    <input
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      placeholder="Active"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    {errors.status && (
                      <p className="text-red-600 text-sm mt-1">{errors.status}</p>
                    )}
                  </div>

                  {/* Tenant Code */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Tenant Code
                    </label>
                    <input
                      name="tenant_code"
                      value={form.tenant_code}
                      onChange={handleChange}
                      placeholder="Unique tenant identifier"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    {errors.tenant_code && (
                      <p className="text-red-600 text-sm mt-1">{errors.tenant_code}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Create a strong password"
                        className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <div className="mt-2 flex items-center space-x-2">
                      <div className={`h-2 w-full bg-slate-200 rounded-full overflow-hidden`}>
                        <div className={`h-full transition-all ${
                          getPasswordStrength() === "Strong" ? "w-full bg-green-500" :
                          getPasswordStrength() === "Medium" ? "w-2/3 bg-yellow-500" :
                          getPasswordStrength() === "Weak" ? "w-1/3 bg-red-500" : "w-0"
                        }`} />
                      </div>
                      <span className={`text-sm font-medium ${
                        getPasswordStrength() === "Strong" ? "text-green-600" :
                        getPasswordStrength() === "Medium" ? "text-yellow-600" :
                        "text-red-600"
                      }`}>
                        {getPasswordStrength() || "Enter password"}
                      </span>
                    </div>
                    {errors.password && (
                      <p className="text-red-600 text-sm mt-1">{errors.password}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between pt-6">
                  <button 
                    type="button" 
                    onClick={goBack} 
                    className="py-3 px-6 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium flex items-center"
                  >
                    <ArrowLeft className="mr-2 w-4 h-4" />
                    Back
                  </button>
                  <button 
                    type="submit" 
                    className="py-3 px-6 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors font-medium flex items-center"
                  >
                    Complete Registration
                    <CheckCircle className="ml-2 w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
              </form>
            </div>
          </div>
        </div>
      </div>
  );
}
