// import { Injectable } from '@angular/core';

// @Injectable({
//   providedIn: 'root',
// })
// export class Supabase {

// }
import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase.client';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  get client(): SupabaseClient {
    return getSupabaseClient();
  }
}
