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

  // Restaurants
  tabVisited: 'Visited',
  tabWishlist: 'Wishlist',
  emptyVisited: 'No visited restaurants yet.',
  emptyWishlist: 'Your wishlist is empty.',
  addToWishlist: 'Add to wishlist',
  addVisitedRestaurant: 'Add visited restaurant',
  confirmRemoveFrom: (label: string) => `Remove from ${label}?`,
  visitedList: 'visited list',
  wishlist: 'wishlist',

  // Restaurant Detail
  restaurantsSlash: (name: string) => `Restaurants / ${name}`,
  sectionReviews: 'Reviews',
  sectionFoodReviews: 'Food Reviews',
  emptyReviews: 'No reviews yet.',
  emptyFoodReviews: 'No food reviews yet.',
  restaurantNotFound: 'Restaurant not found.',
  confirmDeleteReview: 'Delete this review?',
  confirmDeleteFoodReview: 'Delete this food review?',

  // Map
  mapVisited: 'Visited',
  mapWishlist: 'Wishlist',

  // Review Card
  visited: (date: string) => `Visited ${date}`,
  cleanliness: 'Cleanliness',
  experience: 'Experience',
  rating: 'Rating',

  // Add Restaurant Modal
  addRestaurantTitle: 'Add Restaurant',
  searchPlaceholder: 'Search for a restaurant...',
  noResults: 'No results found',
  searchInstruction: 'Type a restaurant name to search',
  addingRestaurant: 'Adding restaurant...',
  failedCreateRestaurant: 'Failed to create restaurant',

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

  // Add Review Modal
  addReviewTitle: 'Add Review',
  visitedOnOptional: 'Visited on (optional)',
  datePlaceholder: 'YYYY-MM-DD',
  commentOptional: 'Comment (optional)',
  commentPlaceholder: 'How was your experience?',
  submitReview: 'Submit Review',
  failedSubmitReview: 'Failed to submit review',

  // Add Food Review Modal
  addFoodReviewTitle: 'Add Food Review',
  foodName: 'Food Name',
  foodNamePlaceholder: 'e.g. Margherita Pizza',
  priceLabel: 'Price (\u20AC)',
  pricePlaceholder: 'e.g. 12.50',
  dishCommentPlaceholder: 'How was the dish?',
  photosOptional: 'Photos (optional)',
  gallery: 'Gallery',
  camera: 'Camera',
  submitFoodReview: 'Submit Food Review',
  failedSubmitFoodReview: 'Failed to submit food review',

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
}

export type Translations = {
  [K in keyof typeof en]: (typeof en)[K] extends (...args: infer A) => string
    ? (...args: A) => string
    : string
}

export default en as Translations
