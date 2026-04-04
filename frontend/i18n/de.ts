import type { Translations } from './en'

const de: Translations = {
  // Common
  appName: 'ResRank',
  cancel: 'Abbrechen',
  delete: 'L\u00F6schen',
  remove: 'Entfernen',
  confirm: 'Best\u00E4tigen',
  add: 'Hinzuf\u00FCgen',
  back: 'Zur\u00FCck',
  you: 'Du',
  anonymous: 'Anonym',
  error: 'Fehler',

  // Auth
  authSignIn: 'Anmelden',
  authCreateAccount: 'Konto erstellen',
  authFirstName: 'Vorname',
  authLastName: 'Nachname',
  authEmail: 'E-Mail',
  authPassword: 'Passwort',
  authRegister: 'Registrieren',
  authLogin: 'Anmelden',
  authAlreadyHaveAccount: 'Bereits ein Konto? Anmelden',
  authNoAccount: 'Noch kein Konto? Registrieren',
  authInvalidCredentials: 'Ung\u00FCltige E-Mail oder Passwort.',
  authEmailInUse: 'E-Mail wird bereits verwendet.',

  // Home
  homeGreeting: (name: string) => `Hallo, ${name}!`,
  homeRestaurants: 'Restaurants',
  homeMap: 'Karte',
  homeLogout: 'Abmelden',

  // Navigation
  navWelcome: 'Willkommen',
  navHome: 'Startseite',
  navRestaurants: 'Restaurants',
  navMap: 'Karte',
  navRestaurant: 'Restaurant',
  navProfile: 'Profil',

  // Restaurants
  tabVisited: 'Besucht',
  tabWishlist: 'Wunschliste',
  emptyVisited: 'Noch keine besuchten Restaurants.',
  emptyWishlist: 'Deine Wunschliste ist leer.',
  addToWishlist: 'Zur Wunschliste hinzuf\u00FCgen',
  addVisitedRestaurant: 'Besuchtes Restaurant hinzuf\u00FCgen',
  filterFrom: 'Von',
  filterTo: 'Bis',
  searchByName: 'Nach Name suchen...',
  filterByCuisine: 'Küche',
  dateRange: 'Zeitraum',
  applyFilters: 'Anwenden',
  clearFilters: 'Zurücksetzen',
  filtersTitle: 'Suchen & Filtern',
  allCuisines: 'Alle',
  confirmRemoveFrom: (label: string) => `Von ${label} entfernen?`,
  visitedList: 'Besuchte-Liste',
  wishlist: 'Wunschliste',

  // Restaurant Detail
  restaurantsSlash: (name: string) => `Restaurants / ${name}`,
  sectionReviews: 'Bewertungen',
  emptyReviews: 'Noch keine Bewertungen.',
  restaurantNotFound: 'Restaurant nicht gefunden.',
  confirmDeleteReview: 'Diese Bewertung l\u00F6schen?',

  // Map
  mapVisited: 'Besucht',
  mapWishlist: 'Wunschliste',

  // Review Card
  visited: (date: string) => `Besucht am ${date}`,
  cleanliness: 'Sauberkeit',
  ambiance: 'Ambiente',
  rating: 'Bewertung',

  // Add Restaurant Modal
  addRestaurantTitle: 'Restaurant hinzuf\u00FCgen',
  searchPlaceholder: 'Nach Restaurant suchen...',
  noResults: 'Keine Ergebnisse gefunden',
  searchInstruction: 'Restaurantname eingeben zum Suchen',
  addingRestaurant: 'Restaurant wird hinzugef\u00FCgt...',
  failedCreateRestaurant: 'Restaurant konnte nicht erstellt werden',

  // Add Visited Modal
  addVisitedTitle: 'Besuchtes hinzuf\u00FCgen',
  fromWishlistTitle: 'Von Wunschliste',
  searchRestaurantTitle: 'Restaurant suchen',
  fromWishlistOption: 'Von Wunschliste',
  restaurantCount: (count: number) => `${count} Restaurant${count !== 1 ? 's' : ''}`,
  searchNewOption: 'Neu suchen',
  findOnGoogleMaps: 'Auf Google Maps finden',
  wishlistEmpty: 'Deine Wunschliste ist leer',
  failedAddRestaurant: 'Restaurant konnte nicht hinzugef\u00FCgt werden',

  // Edit
  edit: 'Bearbeiten',
  edited: 'bearbeitet',
  editReviewTitle: 'Bewertung bearbeiten',
  saveChanges: '\u00C4nderungen speichern',
  failedUpdateReview: 'Bewertung konnte nicht aktualisiert werden',

  // Add Review Modal
  addReviewTitle: 'Bewertung hinzuf\u00FCgen',
  visitedOnOptional: 'Besucht am (optional)',
  datePlaceholder: 'JJJJ-MM-TT',
  commentOptional: 'Kommentar (optional)',
  commentPlaceholder: 'Wie war dein Erlebnis?',
  submitReview: 'Bewertung absenden',
  failedSubmitReview: 'Bewertung konnte nicht gesendet werden',

  // Food Items
  foodItems: 'Gerichte',
  foodItemsHint: 'Optional Gerichte hinzuf\u00FCgen, die du probiert hast.',
  showFoodItems: (count: number) => `Gerichte anzeigen (${count})`,
  hideFoodItems: 'Gerichte ausblenden',
  visitedAt: (date: string) => `Besucht am: ${date}`,
  foodName: 'Gericht',
  foodNamePlaceholder: 'z.B. Pizza Margherita',
  priceLabel: 'Preis (\u20AC)',
  pricePlaceholder: 'z.B. 12,50',
  dishCommentPlaceholder: 'Wie war das Gericht?',
  photosOptional: 'Fotos (optional)',
  gallery: 'Galerie',
  camera: 'Kamera',

  // Confirm Modal
  confirmLogout: 'Abmelden?',
  confirmLogoutMessage: 'Du musst dich erneut anmelden.',
  logout: 'Abmelden',

  // Cuisine Types
  cuisineBrewery: 'Brauerei',
  cuisineBar: 'Bar',
  cuisineCafe: 'Cafe',
  cuisineItalian: 'Italienisch',
  cuisineJapanese: 'Japanisch',
  cuisineChinese: 'Chinesisch',
  cuisineAsian: 'Asiatisch',
  cuisineIndian: 'Indisch',
  cuisineMexican: 'Mexikanisch',
  cuisineGreek: 'Griechisch',
  cuisineOriental: 'Orientalisch',
  cuisineBurger: 'Burger',
  cuisineSandwiches: 'Sandwiches',
  cuisineBbq: 'BBQ',
  cuisineFusion: 'Fusion',
  cuisineOthers: 'Sonstiges',
  selectCuisineType: 'Kategorie wählen',

  // Not Found
  oops: 'Hoppla!',
  screenNotExist: 'Diese Seite existiert nicht.',
  goHome: 'Zur Startseite!',

  // Language
  language: 'Sprache',

  // Settings
  navSettings: 'Einstellungen',
  settingsLanguage: 'Sprache',
  settingsTheme: 'Erscheinungsbild',
  themeDark: 'Dunkel',
  themeLight: 'Hell',

  // Friends
  friends: 'Freunde',
  searchFriends: 'Benutzer suchen...',
  addFriend: 'Hinzufügen',
  removeFriend: 'Entfernen',
  noFriendsYet: 'Noch keine Freunde.',
  noUsersFound: 'Keine Benutzer gefunden.',

  // Coauthors
  coauthors: 'Co-Autoren',
  withCoauthors: 'mit',
  inviteFriend: 'Freund einladen',

  // Admin Panel
  adminPanel: 'Admin-Bereich',
  adminUsers: 'Benutzer',
  adminName: 'Name',
  adminEmail: 'E-Mail',
  adminRole: 'Rolle',
  adminLastLoggedIn: 'Letzter Login',
  adminNever: 'Nie',
  adminLoadingUsers: 'Benutzer werden geladen...',
  adminFailedToLoad: 'Benutzer konnten nicht geladen werden.',
}

export default de
