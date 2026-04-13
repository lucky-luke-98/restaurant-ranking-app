const en = {
  // Common
  appName: 'ResRank',
  cancel: 'Cancel',
  delete: 'Delete',
  remove: 'Remove',
  confirm: 'Confirm',
  add: 'Add',
  back: 'Back',
  you: 'You',
  anonymous: 'Anonymous',
  error: 'Error',

  // Auth
  authSignIn: 'Sign In',
  authCreateAccount: 'Create Account',
  authFirstName: 'First Name',
  authLastName: 'Last Name',
  authEmail: 'Email',
  authPassword: 'Password',
  authRegister: 'Register',
  authLogin: 'Login',
  authAlreadyHaveAccount: 'Already have an account? Sign in',
  authNoAccount: "Don't have an account? Register",
  authInvalidCredentials: 'Invalid email or password.',
  authEmailInUse: 'Email already in use.',

  // Home
  homeGreeting: (name: string) => `Hello, ${name}!`,
  homeRestaurants: 'Restaurants',
  homeMap: 'Map',
  homeLogout: 'Logout',

  // Navigation
  navWelcome: 'Welcome',
  navHome: 'Home',
  navRestaurants: 'Restaurants',
  navMap: 'Map',
  navRestaurant: 'Restaurant',
  navProfile: 'Profile',

  // Restaurants
  tabVisited: 'Visited',
  tabWishlist: 'Wishlist',
  emptyVisited: 'No visited restaurants yet.',
  emptyWishlist: 'Your wishlist is empty.',
  addToWishlist: 'Add to wishlist',
  addVisitedRestaurant: 'Add visited restaurant',
  filterFrom: 'From',
  filterTo: 'To',
  searchByName: 'Search by name...',
  filterByCuisine: 'Cuisine Type',
  dateRange: 'Date Range',
  applyFilters: 'Apply',
  clearFilters: 'Clear',
  filtersTitle: 'Search & Filter',
  allCuisines: 'All',
  confirmRemoveFrom: (label: string) => `Remove from ${label}?`,
  visitedList: 'visited list',
  wishlist: 'wishlist',

  // Restaurant Detail
  restaurantsSlash: (name: string) => `Restaurants / ${name}`,
  sectionReviews: 'Reviews',
  emptyReviews: 'No reviews yet.',
  restaurantNotFound: 'Restaurant not found.',
  confirmDeleteReview: 'Delete this review?',

  // Map
  mapVisited: 'Visited',
  mapWishlist: 'Wishlist',

  // Review Card
  visited: (date: string) => `Visited ${date}`,
  cleanliness: 'Cleanliness',
  ambiance: 'Ambiance',
  rating: 'Rating',

  // Add Restaurant Modal
  addRestaurantTitle: 'Add Restaurant',
  searchPlaceholder: 'Search for a restaurant...',
  noResults: 'No results found',
  searchInstruction: 'Type a restaurant name to search',
  addingRestaurant: 'Adding restaurant...',
  failedCreateRestaurant: 'Failed to create restaurant',

  // Wishlist Comment
  wishlistCommentLabel: 'Why do you want to visit? (optional)',
  wishlistCommentPlaceholder: 'e.g. "Friends raved about the tiramisu"',
  editWishlistComment: 'Edit note',
  addWishlistComment: 'Add a note',
  wishlistCommentTitle: 'Your note',
  save: 'Save',
  charsRemaining: (n: number) => `${n} characters left`,

  // Add Visited Modal
  addVisitedTitle: 'Add Visited',
  fromWishlistTitle: 'From Wishlist',
  searchRestaurantTitle: 'Search Restaurant',
  fromWishlistOption: 'From Wishlist',
  restaurantCount: (count: number) => `${count} restaurant${count !== 1 ? 's' : ''}`,
  searchNewOption: 'Search New',
  findOnGoogleMaps: 'Find on Google Maps',
  wishlistEmpty: 'Your wishlist is empty',
  failedAddRestaurant: 'Failed to add restaurant',

  // Edit
  edit: 'Edit',
  edited: 'edited',
  editReviewTitle: 'Edit Review',
  saveChanges: 'Save Changes',
  failedUpdateReview: 'Failed to update review',

  // Add Review Modal
  addReviewTitle: 'Add Review',
  visitedOnOptional: 'Visited on (optional)',
  datePlaceholder: 'YYYY-MM-DD',
  commentOptional: 'Comment (optional)',
  commentPlaceholder: 'How was your visit?',
  submitReview: 'Submit Review',
  failedSubmitReview: 'Failed to submit review',

  // Food Items
  foodItems: 'Food Items',
  foodItemsHint: 'Optionally add food items you tried.',
  showFoodItems: (count: number) => `Show food items (${count})`,
  hideFoodItems: 'Hide food items',
  visitedAt: (date: string) => `Visited at: ${date}`,
  foodName: 'Food Name',
  foodNamePlaceholder: 'e.g. Margherita Pizza',
  priceLabel: 'Price (\u20AC)',
  pricePlaceholder: 'e.g. 12.50',
  dishCommentPlaceholder: 'How was the dish?',
  photosOptional: 'Photos (optional)',
  gallery: 'Gallery',
  camera: 'Camera',

  // Confirm Modal
  confirmLogout: 'Log out?',
  confirmLogoutMessage: 'You will need to sign in again.',
  logout: 'Log out',

  // Cuisine Types
  cuisineBrewery: 'Brewery',
  cuisineBar: 'Bar',
  cuisineCafe: 'Cafe',
  cuisineItalian: 'Italian',
  cuisineJapanese: 'Japanese',
  cuisineChinese: 'Chinese',
  cuisineAsian: 'Asian',
  cuisineIndian: 'Indian',
  cuisineMexican: 'Mexican',
  cuisineGreek: 'Greek',
  cuisineOriental: 'Oriental',
  cuisineBurger: 'Burger',
  cuisineSandwiches: 'Sandwiches',
  cuisineBbq: 'BBQ',
  cuisineFusion: 'Fusion',
  cuisineOthers: 'Others',
  selectCuisineType: 'Select cuisine type',

  // Not Found
  oops: 'Oops!',
  screenNotExist: 'This screen does not exist.',
  goHome: 'Go to home screen!',

  // Language
  language: 'Language',

  // Settings
  navSettings: 'Settings',
  settingsLanguage: 'Language',
  settingsTheme: 'Theme',
  themeDark: 'Dark',
  themeLight: 'Light',

  // Friends
  friends: 'Friends',
  searchFriends: 'Search users...',
  addFriend: 'Add',
  removeFriend: 'Remove',
  noFriendsYet: 'No friends yet.',
  noUsersFound: 'No users found.',

  // Coauthors
  coauthors: 'Co-authors',
  withCoauthors: 'with',
  inviteFriend: 'Invite friend',
  leaveReview: 'Leave',
  confirmLeaveReview: 'Leave this review?',

  // Admin Panel
  adminPanel: 'Admin Panel',
  adminUsers: 'Users',
  adminName: 'Name',
  adminEmail: 'Email',
  adminRole: 'Role',
  adminLastLoggedIn: 'Last Login',
  adminNever: 'Never',
  adminLoadingUsers: 'Loading users...',
  adminFailedToLoad: 'Failed to load users.',
}

export type Translations = {
  [K in keyof typeof en]: (typeof en)[K] extends (...args: infer A) => string
    ? (...args: A) => string
    : string
}

export default en as Translations
