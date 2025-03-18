export interface Database {
  public: {
    Tables: {
      gmail_accounts: {
        Row: {
          id: string
          user_id: string
          email: string
          access_token: string
          refresh_token: string
          token_expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          access_token: string
          refresh_token: string
          token_expires_at: string
          created_at?: string
          updated_at: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          access_token?: string
          refresh_token?: string
          token_expires_at?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
