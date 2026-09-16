import { createClient } from '@/lib/supabase/server';
import { User, Role } from '@/types/dashboard';

/**
 * Get the current authenticated user with their roles
 */
export async function getCurrentUser(): Promise<User | null> {
    const supabase = await createClient();

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
        return null;
    }

    // Fetch user data with roles
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
      *,
      user_roles (
        role_id,
        roles (
          id,
          name,
          description
        )
      )
    `)
        .eq('id', authUser.id)
        .single();

    if (userError || !userData) {
        return null;
    }

    // Transform the data to include roles array
    const roles = userData.user_roles?.map((ur: any) => ur.roles).filter(Boolean) || [];

    return {
        ...userData,
        roles,
    };
}

/**
 * Check if the current user has a specific role
 */
export async function hasRole(roleName: string): Promise<boolean> {
    const user = await getCurrentUser();

    if (!user || !user.roles) {
        return false;
    }

    return user.roles.some((role) => role.name === roleName);
}

/**
 * Check if the current user has any of the specified roles
 */
export async function hasAnyRole(roleNames: string[]): Promise<boolean> {
    const user = await getCurrentUser();

    if (!user || !user.roles) {
        return false;
    }

    return user.roles.some((role) => roleNames.includes(role.name));
}

/**
 * Check if the current user is internal staff
 */
export async function isInternal(): Promise<boolean> {
    const user = await getCurrentUser();
    return user?.is_internal || false;
}

/**
 * Check if the current user is a creditor
 */
export async function isCreditor(): Promise<boolean> {
    const user = await getCurrentUser();
    return user?.is_creditor || false;
}

/**
 * Check if the current user is a debtor
 */
export async function isDebtor(): Promise<boolean> {
    const user = await getCurrentUser();
    return user?.is_debtor || false;
}

/**
 * Get user role names as array
 */
export async function getUserRoles(): Promise<string[]> {
    const user = await getCurrentUser();
    return user?.roles?.map((role) => role.name) || [];
}
