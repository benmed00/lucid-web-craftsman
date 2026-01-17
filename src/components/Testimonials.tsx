import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { useTranslation } from 'react-i18next';

const Testimonials = () => {
  const { t } = useTranslation('pages');
  
  const testimonials = [
    {
      id: 1,
      name: "Emma Thompson",
      avatar: "ET",
      rating: 5,
      textKey: "home.testimonials.reviews.emma",
    },
    {
      id: 2,
      name: "Michael Chen",
      avatar: "MC",
      rating: 5,
      textKey: "home.testimonials.reviews.michael",
    },
    {
      id: 3,
      name: "Sarah Johnson",
      avatar: "SJ",
      rating: 5,
      textKey: "home.testimonials.reviews.sarah",
    },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {testimonials.map((testimonial) => (
        <Card key={testimonial.id} className="bg-card border-none shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="p-4 sm:p-6">
            <div className="flex mb-3 sm:mb-4">
              {[...Array(testimonial.rating)].map((_, i) => (
                <Star key={i} className="h-4 w-4 sm:h-5 sm:w-5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-muted-foreground mb-4 sm:mb-6 italic text-sm sm:text-base leading-relaxed">"{t(testimonial.textKey)}"</p>
            <div className="flex items-center">
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10 mr-2 sm:mr-3">
                <AvatarFallback className="bg-primary/20 text-primary text-xs sm:text-sm">{testimonial.avatar}</AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground text-sm sm:text-base">{testimonial.name}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default Testimonials;
