import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useOrderNotifications = () => {
  useEffect(() => {
    // Subscribe to order status changes
    const channel = supabase
      .channel('order-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: 'status=neq.pending'
        },
        async (payload) => {
          console.log('Order status changed:', payload);
          
          if (payload.new && payload.old && payload.new.status !== payload.old.status) {
            try {
              // Get customer email from profile
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', payload.new.user_id)
                .single();
              
              if (profileError) {
                console.error('Error fetching customer profile:', profileError);
                return;
              }

              // Get customer email from auth.users (this needs to be done server-side)
              // For now, we'll call the edge function without the email
              // The edge function would need to fetch the email server-side
              
              const notificationData = {
                order_id: payload.new.id,
                status: payload.new.status,
                customer_email: '', // This should be fetched server-side
                customer_name: profile?.full_name || 'Client',
                order_total: payload.new.amount / 100, // Convert from cents
                currency: payload.new.currency.toUpperCase()
              };

              // Call the edge function to send the notification
              const { error: emailError } = await supabase.functions.invoke('send-order-notification', {
                body: notificationData
              });

              if (emailError) {
                console.error('Error sending order notification:', emailError);
              } else {
                console.log('Order notification sent successfully');
              }
            } catch (error) {
              console.error('Error processing order status change:', error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
};