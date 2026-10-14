// Central configuration for My Teacher Life.

export const APP = {
  name: 'My Teacher Life',
  studio: 'Red Pen Studio',
  version: '1.0.0',
  storageKey: 'mtl_save_v1',
};

// ---------------------------------------------------------------------------
// AdMob
// ---------------------------------------------------------------------------
export const ADMOB_APP_ID = 'ca-app-pub-1848535996024012~3576983541';

// Every ad in the game is a Rewarded Video. There are no interstitials.
export const AD_UNITS = {
  OFFLINE_DOUBLE: 'ca-app-pub-1848535996024012/6621863561', // rewarded_offline_double
  AUTO_GRADE: 'ca-app-pub-1848535996024012/2280303036', // rewarded_auto_grade
  SCANNER_VIP: 'ca-app-pub-1848535996024012/4032368404', // rewarded_scanner_vip
  LIBRARY_RUSH: 'ca-app-pub-1848535996024012/9731417641', // rewarded_library_rush
  GOLDEN_STAMP: 'ca-app-pub-1848535996024012/7105254304', // rewarded_golden_stamp
  SCHOOL_GRANT: 'ca-app-pub-1848535996024012/3612556846', // rewarded_school_grant
};

// Set to true ONLY while testing on your own phone. Google then serves
// test ads, which protects your AdMob account from invalid clicks.
// It MUST be false for the Play Store release.
export const ADS_TESTING = false;

// Optional: hashed device IDs that should always receive test ads
// (Logcat prints this ID the first time an ad is requested on a device).
export const ADS_TEST_DEVICES = [];

// ---------------------------------------------------------------------------
// Gameplay tuning
// ---------------------------------------------------------------------------
export const OFFLINE = {
  minHoursForAdOffer: 2, // offer x2/x3 only after 2h away
  maxHours: 12, // earnings stop accumulating after 12h
  tripleAfterHours: 6, // after 6h the ad offer becomes x3
  minCollectSeconds: 60, // ignore very short absences
};

export const BOOSTS = {
  goldenStampMinutes: 5, // Golden Stamp coin boost duration
  goldenStampMultiplier: 2,
  xraySeconds: 10, // Scanner VIP X-ray duration
};

export const MAX_STORY_LEVEL = 120;
