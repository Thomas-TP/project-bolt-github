import { supabase } from "../utils/supabase";

interface Invitation {
  id?: string;
  email: string;
  token: string;
  expires_at: string;
  created_at?: string;
  used_at?: string | null;
}

export const invitationService = {
  async createInvitation(email: string, token: string, expiresInMinutes: number = 1440): Promise<Invitation | null> {
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("invitations")
      .insert({ email, token, expires_at: expiresAt })
      .select()
      .single();

    if (error) {
      console.error("Error creating invitation:", error);
      throw new Error(error.message);
    }
    return data;
  },

  async validateInvitation(token: string): Promise<Invitation | null> {
    const { data, error } = await supabase
      .from("invitations")
      .select("*")
      .eq("token", token)
      .is("used_at", null) // Not yet used
      .gt("expires_at", new Date().toISOString()) // Not expired
      .single();

    if (error && error.code !== "PGRST116") { // PGRST116 means no rows found
      console.error("Error validating invitation:", error);
      throw new Error(error.message);
    }
    return data;
  },

  async markInvitationAsUsed(token: string): Promise<void> {
    const { error } = await supabase
      .from("invitations")
      .update({ used_at: new Date().toISOString() })
      .eq("token", token);

    if (error) {
      console.error("Error marking invitation as used:", error);
      throw new Error(error.message);
    }
  },
};


