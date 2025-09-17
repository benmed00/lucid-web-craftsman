
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar"; // Removed AvatarImage
import { Star } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Emma Thompson",
    avatar: "ET",
    rating: 5,
    text: "I absolutely love my woven tote bag! The craftsmanship is exceptional and it's exactly what I was looking for to complement my sustainable lifestyle. Highly recommend!",
  },
  {
    id: 2,
    name: "Michael Chen",
    avatar: "MC",
    rating: 5,
    text: "The quality of the hat I purchased exceeded my expectations. It's comfortable, stylish, and I appreciate knowing it was made with sustainable practices. Will definitely shop here again.",
  },
  {
    id: 3,
    name: "Sarah Johnson",
    avatar: "SJ",
    rating: 5,
    text: "Not only are the products beautiful, but the customer service is outstanding. My bag arrived beautifully packaged with a personal note. It's these touches that make all the difference.",
  },
];

const Testimonials = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {testimonials.map((testimonial) => (
        <Card key={testimonial.id} className="bg-white border-none shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="p-4 sm:p-6">
            <div className="flex mb-3 sm:mb-4">
              {[...Array(testimonial.rating)].map((_, i) => (
                <Star key={i} className="h-4 w-4 sm:h-5 sm:w-5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-stone-600 mb-4 sm:mb-6 italic text-sm sm:text-base leading-relaxed">"{testimonial.text}"</p>
            <div className="flex items-center">
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10 mr-2 sm:mr-3">
                <AvatarFallback className="bg-olive-200 text-olive-800 text-xs sm:text-sm">{testimonial.avatar}</AvatarFallback>
              </Avatar>
              <span className="font-medium text-stone-800 text-sm sm:text-base">{testimonial.name}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default Testimonials;
