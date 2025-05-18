
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {testimonials.map((testimonial) => (
        <Card key={testimonial.id} className="bg-white border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex mb-4">
              {[...Array(testimonial.rating)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-stone-600 mb-6 italic">"{testimonial.text}"</p>
            <div className="flex items-center">
              <Avatar className="h-10 w-10 mr-3">
                <AvatarFallback className="bg-olive-200 text-olive-800">{testimonial.avatar}</AvatarFallback>
              </Avatar>
              <span className="font-medium text-stone-800">{testimonial.name}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default Testimonials;
