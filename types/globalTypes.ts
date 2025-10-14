export interface TrackingSession {
  session_start: string;
  session_end: string;
  elapsed_time: number;
}

export interface TimeEntry {
  id: string;
  created_at: string;
  start_time: string;
  end_time: string | null;
  time_lapsed: number | null;
  client_company: string;
  client_id: string;
  description: string;
  client_project: string;
  tracking_finished: boolean;
  tracking_sessions: TrackingSession[]; // Add this line
}

export interface Client {
  id: string;
  client_first: string;
  client_last: string;
  client_email: string;
  client_phone: string;
  client_company: string;
  created_at: string;
  client_color?: string;     
  client_image?: string; 
}
