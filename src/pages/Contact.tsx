import { useState, lazy, Suspense, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from "@/components/ui/card";
import SEOHelmet from "@/components/seo/SEOHelmet";
import {
  Mail,
  MapPin,
  Phone,
  Clock,
  Send,
  MessageSquare,
  Package,
  User,
  Building,
  Globe,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import PageFooter from "@/components/PageFooter";
import { toast } from "sonner";
import { useCsrfToken } from "@/hooks/useCsrfToken";
import { validateAndSanitizeEmail, validateAndSanitizeName, sanitizeUserInput } from "@/utils/xssProtection";
import { createRateLimiter } from "@/utils/validation";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompanySettings, formatFullAddress } from "@/hooks/useCompanySettings";
import { apiClient } from "@/lib/api/apiClient";
import { handleError, ValidationError } from "@/lib/errors/AppError";
import { EXTERNAL_SERVICES } from "@/config/app.config";

// Lazy load the map component for better performance
const LocationMap = lazy(() => import("@/components/ui/LocationMap"));
const contactRateLimiter = createRateLimiter(3, 10 * 60 * 1000); // 3 attempts per 10 minutes

const Contact = () => {
  const { t } = useTranslation(['pages', 'common']);
  // Get company settings from database
  const { settings: companySettings, isLoading: isLoadingSettings } = useCompanySettings();
  
  // Form states
  const [contactForm, setContactForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    subject: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { csrfToken } = useCsrfToken();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limiting
    const clientId = navigator.userAgent + window.location.hostname;
    if (!contactRateLimiter(clientId)) {
      toast.error(t('contact.form.rateLimited'));
      return;
    }

    // Validation and sanitization
    try {
      const sanitizedData = {
        firstName: validateAndSanitizeName(contactForm.firstName),
        lastName: validateAndSanitizeName(contactForm.lastName),
        email: validateAndSanitizeEmail(contactForm.email),
        phone: sanitizeUserInput(contactForm.phone),
        company: sanitizeUserInput(contactForm.company),
        subject: sanitizeUserInput(contactForm.subject.trim()),
        message: sanitizeUserInput(contactForm.message.trim())
      };

      if (sanitizedData.subject.length < 5) {
        throw new ValidationError(
          t('contact.form.validation.subjectMinLength'),
          { subject: t('contact.form.validation.subjectMinLength') }
        );
      }

      if (sanitizedData.message.length < 20) {
        throw new ValidationError(
          t('contact.form.validation.messageMinLength'),
          { message: t('contact.form.validation.messageMinLength') }
        );
      }

      setIsSubmitting(true);
      
      // Use centralized API client for consistent error handling
      await apiClient.post(
        `${EXTERNAL_SERVICES.supabase.url}/functions/v1/submit-contact`,
        sanitizedData,
        {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || 'anon'}`
          }
        }
      );
      
      toast.success(t('contact.form.success'));
      
      // Reset form
      setContactForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        company: '',
        subject: '',
        message: ''
      });

    } catch (error) {
      const appError = handleError(error);
      toast.error(appError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHelmet
        title={t('contact.seo.title')}
        description={t('contact.seo.description')}
        keywords={["contact", "support", "artisanat marocain", "service client"]}
        url="/contact"
        type="website"
      />
      

      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-20">
        <div className="absolute inset-0 bg-foreground/10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-serif text-4xl md:text-6xl mb-6 leading-tight">
              {t('contact.hero.title')}
            </h1>
            <p className="text-xl md:text-2xl text-primary-foreground/80 mb-8 leading-relaxed">
              {t('contact.hero.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Button 
                        size="lg" 
                        className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 px-8 py-3 text-lg font-semibold"
                        id="contact-hero-button"
                        name="start-contact-discussion"
                      >
                        <MessageSquare className="mr-2 h-5 w-5" />
                        {t('contact.hero.cta')}
                      </Button>
            </div>
          </div>
        </div>

        {/* Decorative floating cards */}
        <div className="absolute top-10 left-10 transform rotate-12 opacity-80 hidden lg:block">
          <Card className="w-64 shadow-xl bg-card">
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground mb-2">{t('contact.cards.general.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('contact.cards.general.description')}</p>
            </CardContent>
          </Card>
        </div>

        <div className="absolute top-32 right-16 transform -rotate-6 opacity-80 hidden lg:block">
          <Card className="w-56 shadow-xl bg-card">
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground mb-2">{t('contact.cards.support.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('contact.cards.support.description')}</p>
            </CardContent>
          </Card>
        </div>

        <div className="absolute bottom-10 left-1/4 transform rotate-3 opacity-80 hidden lg:block">
          <Card className="w-48 shadow-xl bg-card">
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground mb-2">{t('contact.cards.partnership.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('contact.cards.partnership.description')}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Contact Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
              
              {/* Left Sidebar - Contact Info */}
              <div className="lg:col-span-2 space-y-8">
                <div>
                  <h2 className="font-serif text-3xl text-foreground mb-6">{t('contact.info.title')}</h2>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {t('contact.info.description')}
                  </p>
                </div>

                {/* Contact Information Cards */}
                <div className="space-y-4">
                  <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow bg-card">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <Mail className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground mb-2">{t('contact.info.email')}</h3>
                          {isLoadingSettings ? (
                            <Skeleton className="h-4 w-32" />
                          ) : (
                            <p className="text-muted-foreground">{companySettings.email}</p>
                          )}
                          <p className="text-sm text-muted-foreground">{t('contact.info.emailResponse')}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow bg-card">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <Phone className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground mb-2">{t('contact.info.phone')}</h3>
                          {isLoadingSettings ? (
                            <Skeleton className="h-4 w-32" />
                          ) : (
                            <p className="text-muted-foreground">{companySettings.phone}</p>
                          )}
                          <p className="text-sm text-muted-foreground">{t('contact.info.phoneHours')}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow bg-card">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <MapPin className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground mb-2">{t('contact.info.address')}</h3>
                          {isLoadingSettings ? (
                            <>
                              <Skeleton className="h-4 w-40 mb-1" />
                              <Skeleton className="h-4 w-32" />
                            </>
                          ) : (
                            <>
                              <p className="text-muted-foreground">{companySettings.address.street}</p>
                              <p className="text-muted-foreground">{companySettings.address.postalCode} {companySettings.address.city}, {companySettings.address.country}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow bg-card">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <Clock className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground mb-2">{t('contact.info.hours')}</h3>
                          {isLoadingSettings ? (
                            <>
                              <Skeleton className="h-4 w-40 mb-1" />
                              <Skeleton className="h-4 w-32 mb-1" />
                              <Skeleton className="h-4 w-28" />
                            </>
                          ) : (
                            <>
                              <p className="text-muted-foreground">{companySettings.openingHours.weekdays}</p>
                              <p className="text-muted-foreground">{companySettings.openingHours.saturday}</p>
                              <p className="text-muted-foreground">{companySettings.openingHours.sunday}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Services Section */}
                <div className="bg-secondary rounded-xl p-6">
                  <h3 className="font-serif text-xl text-foreground mb-4">{t('contact.services.title')}</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-primary" />
                      <span className="text-muted-foreground">{t('contact.services.customOrders')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-primary" />
                      <span className="text-muted-foreground">{t('contact.services.expertAdvice')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Building className="h-5 w-5 text-primary" />
                      <span className="text-muted-foreground">{t('contact.services.b2b')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-primary" />
                      <span className="text-muted-foreground">{t('contact.services.international')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Contact Form */}
              <div className="lg:col-span-3">
                <Card className="shadow-xl border-0 overflow-hidden bg-card">
                  <div className="bg-gradient-to-r from-primary to-primary/80 p-6">
                    <h2 className="font-serif text-2xl text-primary-foreground mb-2">{t('contact.form.title')}</h2>
                    <p className="text-primary-foreground/80">{t('contact.form.subtitle')}</p>
                  </div>
                  
                  <CardContent className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6" role="form">
                      <input type="hidden" name="csrf_token" value={csrfToken} />
                      
                      <fieldset className="space-y-6">
                        <legend className="sr-only">{t('contact.form.firstName')}</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="firstName" className="text-foreground font-medium">
                              {t('contact.form.firstName')} *
                            </Label>
                            <Input
                              id="firstName"
                              name="contact-first-name"
                              placeholder={t('contact.form.firstName')}
                              value={contactForm.firstName}
                              onChange={(e) => setContactForm(prev => ({...prev, firstName: e.target.value}))}
                              required
                              aria-required="true"
                              maxLength={50}
                              className="border-border focus:border-primary focus:ring-primary/20 bg-background"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="lastName" className="text-foreground font-medium">
                              {t('contact.form.lastName')} *
                            </Label>
                            <Input 
                              id="lastName"
                              name="contact-last-name"
                              placeholder={t('contact.form.lastName')}
                              value={contactForm.lastName}
                              onChange={(e) => setContactForm(prev => ({...prev, lastName: e.target.value}))}
                              required
                              aria-required="true"
                              maxLength={50}
                              className="border-border focus:border-primary focus:ring-primary/20 bg-background"
                            />
                          </div>
                        </div>
                      </fieldset>

                      <fieldset className="space-y-6">
                        <legend className="sr-only">{t('contact.form.email')}</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="email" className="text-foreground font-medium">
                              {t('contact.form.email')} *
                            </Label>
                            <Input
                              id="email"
                              name="contact-email"
                              type="email"
                              placeholder="votre.email@exemple.com"
                              value={contactForm.email}
                              onChange={(e) => setContactForm(prev => ({...prev, email: e.target.value}))}
                              required
                              aria-required="true"
                              aria-describedby="email-description"
                              maxLength={255}
                              className="border-border focus:border-primary focus:ring-primary/20 bg-background"
                            />
                            <p id="email-description" className="sr-only">{t('contact.form.emailFormat')}</p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="phone" className="text-foreground font-medium">
                              {t('contact.form.phone')}
                            </Label>
                            <Input
                              id="phone"
                              name="contact-phone"
                              type="tel"
                              placeholder={t('contact.form.phonePlaceholder')}
                              value={contactForm.phone}
                              onChange={(e) => setContactForm(prev => ({...prev, phone: e.target.value}))}
                              maxLength={20}
                              className="border-border focus:border-primary focus:ring-primary/20 bg-background"
                            />
                          </div>
                        </div>
                      </fieldset>

                      <div className="space-y-2">
                        <Label htmlFor="company" className="text-foreground font-medium">
                          {t('contact.form.company')}
                        </Label>
                        <Input
                          id="company"
                          name="contact-company"
                          placeholder={t('contact.form.companyPlaceholder')}
                          value={contactForm.company}
                          onChange={(e) => setContactForm(prev => ({...prev, company: e.target.value}))}
                          maxLength={100}
                          className="border-border focus:border-primary focus:ring-primary/20 bg-background"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="subject" className="text-foreground font-medium">
                          {t('contact.form.subject')} *
                        </Label>
                        <select
                          id="subject"
                          name="contact-subject"
                          className="w-full h-11 px-3 py-2 border border-border rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background text-foreground"
                          value={contactForm.subject}
                          onChange={(e) => setContactForm(prev => ({...prev, subject: e.target.value}))}
                          required
                        >
                          <option value="">{t('contact.form.subjectPlaceholder')}</option>
                          <option value="product">{t('contact.form.subjectOptions.product')}</option>
                          <option value="custom-order">{t('contact.form.subjectOptions.customOrder')}</option>
                          <option value="partnership">{t('contact.form.subjectOptions.partnership')}</option>
                          <option value="wholesale">{t('contact.form.subjectOptions.wholesale')}</option>
                          <option value="shipping">{t('contact.form.subjectOptions.shipping')}</option>
                          <option value="support">{t('contact.form.subjectOptions.support')}</option>
                          <option value="other">{t('contact.form.subjectOptions.other')}</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message" className="text-foreground font-medium">
                          {t('contact.form.message')} *
                        </Label>
                        <textarea
                          id="message"
                          name="contact-message"
                          rows={6}
                          placeholder={t('contact.form.messagePlaceholder')}
                          value={contactForm.message}
                          onChange={(e) => setContactForm(prev => ({...prev, message: e.target.value}))}
                          className="w-full px-3 py-3 text-base border border-border rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none bg-background text-foreground"
                          required
                          maxLength={2000}
                        ></textarea>
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-muted-foreground">
                            {contactForm.message.length}/2000 {t('contact.form.characters')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('contact.form.minCharacters')}
                          </p>
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-olive-700 hover:bg-olive-800 text-white py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
                        disabled={isSubmitting}
                        id="contact-form-submit"
                        name="submit-contact-message"
                      >
                        <Send className="h-5 w-5" />
                        {isSubmitting ? t('contact.form.submitting') : t('contact.form.submit')}
                      </Button>
                      
                      <div className="text-center pt-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {t('contact.form.privacy')}
                        </p>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-16 bg-muted/30 dark:bg-muted/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-8">
            <h2 className="font-serif text-3xl text-foreground mb-4">{t('contact.map.title')}</h2>
            <p className="text-muted-foreground text-lg">
              {t('contact.map.description')}
            </p>
          </div>
          
          <Card className="max-w-4xl mx-auto shadow-xl overflow-hidden bg-card">
            <Suspense fallback={
              <div className="aspect-video">
                <Skeleton className="w-full h-full" />
              </div>
            }>
              {!isLoadingSettings && (
                <LocationMap
                  latitude={companySettings.address.latitude}
                  longitude={companySettings.address.longitude}
                  zoom={15}
                  address={formatFullAddress(companySettings.address)}
                  businessName={`${companySettings.name} - Showroom`}
                  className="aspect-video"
                />
              )}
              {isLoadingSettings && (
                <div className="aspect-video">
                  <Skeleton className="w-full h-full" />
                </div>
              )}
            </Suspense>
          </Card>
          
          <div className="max-w-4xl mx-auto mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              <MapPin className="inline-block h-4 w-4 mr-1" />
              {isLoadingSettings ? (
                <Skeleton className="inline-block h-4 w-48" />
              ) : (
                formatFullAddress(companySettings.address)
              )}
            </p>
          </div>
        </div>
      </section>

      <PageFooter />
    </div>
  );
};

export default Contact;