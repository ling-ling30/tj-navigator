export type Locale = 'id' | 'en';

export interface TranslationDictionary {
  // Navigation & General
  'app.title': string;
  'nav.back': string;
  'nav.cancel': string;
  'nav.close': string;
  'nav.refresh': string;
  'lang.toggle': string;

  // Search Screen
  'search.origin_label': string;
  'search.origin_placeholder': string;
  'search.dest_label': string;
  'search.dest_placeholder': string;
  'search.swap_stops': string;
  'search.depart_now': string;
  'search.depart_time': string;
  'search.arrive_by': string;
  'search.modes_header': string;
  'search.mode_all': string;
  'search.mode_tj': string;
  'search.mode_krl': string;
  'search.mode_mrt': string;
  'search.mode_lrt': string;
  'search.mode_mikro': string;
  'search.recents_header': string;
  'search.cta_button': string;

  // Stop Picker
  'picker.search_placeholder': string;
  'picker.results_header': string;
  'picker.nearby_header': string;
  'picker.no_results': string;

  // Results & Itineraries
  'results.title': string;
  'results.count': string;
  'results.direct': string;
  'results.transfers': string;
  'results.duration': string;
  'results.fare_free': string;
  'results.fare_integrated': string;
  'results.fastest_badge': string;
  'results.least_transfers': string;
  'results.status_ontime': string;
  'results.status_delayed': string;
  'results.status_headway': string;
  'results.walk_chip': string;
  'results.filter_title': string;
  'results.filter_max_transfers': string;
  'results.filter_apply': string;

  // Journey Detail & Stepper
  'journey.title': string;
  'journey.platform': string;
  'journey.door': string;
  'journey.direction': string;
  'journey.walk_distance': string;
  'journey.intermediate_stops': string;
  'journey.intermediate_hide': string;
  'journey.tap_instruction': string;
  'journey.tap_transfer_free': string;
  'journey.facility_sheltered': string;
  'journey.facility_step_free': string;
  'journey.exit_instruction': string;
  'journey.radar_cta': string;

  // Live Radar
  'radar.title': string;
  'radar.board_header': string;
  'radar.due_now': string;
  'radar.minutes_away': string;
  'radar.crowd_low': string;
  'radar.crowd_medium': string;
  'radar.crowd_high': string;
  'radar.bottleneck_title': string;
  'radar.bottleneck_desc': string;
  'radar.plan_from_here': string;

  // System States
  'state.loading': string;
  'state.empty_title': string;
  'state.empty_desc': string;
  'state.same_stop_title': string;
  'state.same_stop_desc': string;
  'state.offline_banner': string;
  'state.error_title': string;
  'state.error_retry': string;
  'state.stale_data': string;

  // Transit Network Status
  'status.network_title': string;
  'status.all_normal': string;
  'status.integrated_info': string;
  'status.fare_tip': string;

  // Stop Picker & Geolocation & Custom Points
  'picker.my_location': string;
  'picker.geo_asking': string;
  'picker.geo_denied': string;
  'picker.geo_unavailable': string;
  'picker.geo_timeout': string;
  'picker.custom_point_title': string;
  'picker.custom_point_desc': string;
  'picker.custom_name_placeholder': string;
  'picker.save_favorite': string;
  'picker.favorites_header': string;
  'picker.fav_home': string;
  'picker.fav_office': string;
  'picker.use_point': string;

  // Degradation Ladder
  'ladder.relaxed_badge': string;
  'ladder.relaxed_banner': string;
  'ladder.closest_badge': string;
  'ladder.closest_banner': string;
  'ladder.closest_hint': string;
  'ladder.open_maps_cta': string;
  'ladder.walk_only_badge': string;
  'ladder.walk_only_banner': string;
  'ladder.same_place_title': string;
  'ladder.same_place_desc': string;
  'ladder.uncovered_segment': string;
}

export type TranslationKey = keyof TranslationDictionary;
