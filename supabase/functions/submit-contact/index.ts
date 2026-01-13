import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation functions
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

const validateName = (name: string): boolean => {
  const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/
  return nameRegex.test(name) && name.length >= 2 && name.length <= 50
}

const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))
}

const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '').substring(0, 1000)
}

const checkRateLimit = async (supabaseClient: any, identifier: string): Promise<boolean> => {
  try {
    const { data, error } = await supabaseClient.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_action_type: 'contact_form',
      p_max_attempts: 5,
      p_window_minutes: 60
    })
    
    if (error) {
      console.warn('Rate limit check failed:', error)
      return true // Allow on error to prevent service disruption
    }
    
    return data === true
  } catch (error) {
    console.warn('Rate limit error:', error)
    return true // Allow on error
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get client info for security logging
    // X-Forwarded-For can contain multiple IPs, take the first one
    const forwardedFor = req.headers.get('x-forwarded-for') || ''
    const clientIP = forwardedFor.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '0.0.0.0'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Check rate limiting
    const isAllowed = await checkRateLimit(supabaseClient, clientIP)
    if (!isAllowed) {
      // Log suspicious activity
      await supabaseClient.rpc('log_security_event', {
        p_event_type: 'CONTACT_FORM_RATE_LIMIT',
        p_severity: 'medium',
        p_event_data: JSON.stringify({
          ip_address: clientIP,
          user_agent: userAgent,
          timestamp: new Date().toISOString()
        })
      })

      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      company, 
      subject, 
      message 
    } = await req.json()

    // Validate required fields
    if (!firstName || !lastName || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate input format and content
    if (!validateName(firstName) || !validateName(lastName)) {
      return new Response(
        JSON.stringify({ error: 'Invalid name format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!validateEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (phone && !validatePhone(phone)) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Sanitize inputs
    const sanitizedData = {
      first_name: sanitizeInput(firstName),
      last_name: sanitizeInput(lastName),
      email: sanitizeInput(email),
      phone: phone ? sanitizeInput(phone) : null,
      company: company ? sanitizeInput(company) : null,
      subject: sanitizeInput(subject),
      message: sanitizeInput(message),
      ip_address: clientIP,
      user_agent: userAgent
    }

    // Insert contact message
    const { error } = await supabaseClient
      .from('contact_messages')
      .insert([sanitizedData])

    if (error) {
      console.error('Database error:', error)
      
      // Log security event for database errors
      await supabaseClient.rpc('log_security_event', {
        p_event_type: 'CONTACT_FORM_DB_ERROR',
        p_severity: 'high',
        p_event_data: JSON.stringify({
          error_code: error.code,
          ip_address: clientIP,
          timestamp: new Date().toISOString()
        })
      })
      
      throw error
    }

    // Log successful submission (without sensitive data)
    console.log('Contact form submitted successfully', {
      email: email.substring(0, 3) + '***',
      subject: subject.substring(0, 10) + '...',
      timestamp: new Date().toISOString()
    })

    return new Response(
      JSON.stringify({ success: true, message: 'Contact form submitted successfully' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})