
import { Leaf } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-stone-100 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Leaf className="h-5 w-5 text-olive-700" />
              <span className="font-serif text-xl font-medium text-stone-800">Artisan</span>
            </div>
            <p className="text-stone-600 mb-4">Handcrafted bags and hats made with sustainable materials and traditional techniques.</p>
            <div className="flex space-x-4">
              <a href="#" className="text-stone-500 hover:text-olive-700 transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                </svg>
              </a>
              <a href="#" className="text-stone-500 hover:text-olive-700 transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10 5.523 0 10-4.477 10-10 0-5.523-4.477-10-10-10zm0 18.5c-4.694 0-8.5-3.806-8.5-8.5S7.306 3.5 12 3.5s8.5 3.806 8.5 8.5-3.806 8.5-8.5 8.5zm4.5-12.5c0 .829-.672 1.5-1.5 1.5s-1.5-.671-1.5-1.5c0-.828.672-1.5 1.5-1.5s1.5.672 1.5 1.5zm-7.75 7.25l1.5-1.5c1.311 1.26 3.389 1.26 4.7 0l1.5 1.5c-2.15 2.065-5.55 2.065-7.7 0zm-1.5-1.5c.634-.634 1.494-1.031 2.45-1.11v-2.14h-1.5c-.276 0-.5-.224-.5-.5s.224-.5.5-.5h4.5c.276 0 .5.224.5.5s-.224.5-.5.5H12v2.14c.955.079 1.816.476 2.45 1.11L12 14.5l-2.25-2.25z" />
                </svg>
              </a>
              <a href="#" className="text-stone-500 hover:text-olive-700 transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              <a href="#" className="text-stone-500 hover:text-olive-700 transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7.443 5.35c.639 0 1.23.05 1.77.149a3.367 3.367 0 0 1 1.396.507c.386.237.692.56.918.966.226.406.339.918.339 1.535 0 .639-.149 1.178-.447 1.615-.298.438-.745.799-1.342 1.081.804.237 1.407.639 1.807 1.204.4.565.601 1.25.601 2.055 0 .659-.131 1.235-.392 1.729a3.5 3.5 0 0 1-1.064 1.229 4.96 4.96 0 0 1-1.573.737 6.966 6.966 0 0 1-1.903.245H2V5.35h5.443zm-.322 5.443c.527 0 .961-.121 1.303-.362.34-.241.511-.639.511-1.193 0-.305-.061-.555-.184-.753a1.202 1.202 0 0 0-.49-.467 2.237 2.237 0 0 0-.71-.223 5.219 5.219 0 0 0-.827-.059H4.415v3.055h2.706v.002zm.15 5.728c.31 0 .597-.029.863-.089.265-.06.496-.154.69-.282a1.41 1.41 0 0 0 .459-.507c.11-.21.166-.476.166-.798 0-.63-.184-1.082-.551-1.354-.367-.273-.837-.409-1.413-.409H4.415v3.439h2.856zm7.977 1.333c.724 0 1.377-.089 1.959-.266a6.01 6.01 0 0 0 1.527-.679l.483 1.738a8.307 8.307 0 0 1-1.893.669c-.68.15-1.51.226-2.491.226-.822 0-1.601-.104-2.34-.312a5.613 5.613 0 0 1-1.959-.972 4.739 4.739 0 0 1-1.354-1.668c-.335-.68-.503-1.492-.503-2.436 0-.975.193-1.843.577-2.605.386-.761.901-1.407 1.546-1.938.646-.53 1.397-.936 2.256-1.219a8.453 8.453 0 0 1 2.726-.424c.72 0 1.39.09 2.01.273a5.493 5.493 0 0 1 1.683.784l-.503 1.738a6.117 6.117 0 0 0-1.459-.669 5.126 5.126 0 0 0-1.716-.28c-.918 0-1.686.192-2.304.577-.618.386-1.087.914-1.406 1.583-.321.67-.48 1.42-.48 2.25 0 .86.153 1.613.462 2.258.308.645.766 1.143 1.374 1.493.609.35 1.367.526 2.274.526h.03zm5.146-12.527h2.294v7.055l5.063-7.055h2.344l-4.673 6.425L30 17.853h-2.446l-4.867-7.182v7.182h-2.294V5.327z" />
                </svg>
              </a>
            </div>
          </div>
          <div>
            <h3 className="font-serif text-lg font-medium text-stone-800 mb-4">Shop</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-stone-600 hover:text-olive-700 transition-colors">All Products</a></li>
              <li><a href="#" className="text-stone-600 hover:text-olive-700 transition-colors">Bags</a></li>
              <li><a href="#" className="text-stone-600 hover:text-olive-700 transition-colors">Hats</a></li>
              <li><a href="#" className="text-stone-600 hover:text-olive-700 transition-colors">New Arrivals</a></li>
              <li><a href="#" className="text-stone-600 hover:text-olive-700 transition-colors">Sale</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-serif text-lg font-medium text-stone-800 mb-4">About</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-stone-600 hover:text-olive-700 transition-colors">Our Story</a></li>
              <li><a href="#" className="text-stone-600 hover:text-olive-700 transition-colors">Artisans</a></li>
              <li><a href="#" className="text-stone-600 hover:text-olive-700 transition-colors">Materials</a></li>
              <li><a href="#" className="text-stone-600 hover:text-olive-700 transition-colors">Sustainability</a></li>
              <li><a href="#" className="text-stone-600 hover:text-olive-700 transition-colors">Blog</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-serif text-lg font-medium text-stone-800 mb-4">Help</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-stone-600 hover:text-olive-700 transition-colors">Contact Us</a></li>
              <li><a href="#" className="text-stone-600 hover:text-olive-700 transition-colors">Shipping & Returns</a></li>
              <li><a href="#" className="text-stone-600 hover:text-olive-700 transition-colors">FAQ</a></li>
              <li><a href="#" className="text-stone-600 hover:text-olive-700 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-stone-600 hover:text-olive-700 transition-colors">Terms & Conditions</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-stone-200 mt-12 pt-6 text-center sm:text-left sm:flex sm:justify-between sm:items-center">
          <p className="text-stone-500">© 2023 Artisan. All rights reserved.</p>
          <div className="mt-4 sm:mt-0">
            <div className="flex justify-center sm:justify-end space-x-4">
              <svg className="h-8 w-auto text-stone-400" viewBox="0 0 36 24" fill="currentColor">
                <rect width="36" height="24" rx="4" fill="currentColor" />
                <path d="M10.5 15.5c.6 0 1.1-.3 1.4-.8l.3.8h1.5v-5.3H12v3c0 .7-.2 1.2-1 1.2-.7 0-1-.4-1-1v-3.2H8.3v3.5c0 1.3.8 1.8 2.2 1.8z" fill="white" />
                <path d="M15 15.5h1.7v-5.3H15v5.3zm6.2-5.3h-2.6v5.3h1.7v-1.7h1c1.6 0 2.4-.7 2.4-1.8s-.8-1.8-2.5-1.8zm0 2.5h-.9v-1.3h.9c.6 0 .9.2.9.7 0 .4-.3.6-.9.6z" fill="white" />
              </svg>
              <svg className="h-8 w-auto text-stone-400" viewBox="0 0 36 24" fill="currentColor">
                <rect width="36" height="24" rx="4" fill="currentColor" />
                <path d="M25.4 12c0 2-1.6 3.6-3.6 3.6s-3.6-1.6-3.6-3.6 1.6-3.6 3.6-3.6 3.6 1.6 3.6 3.6zm-8.3 0c0-2.6 2.1-4.7 4.7-4.7s4.7 2.1 4.7 4.7-2.1 4.7-4.7 4.7-4.7-2.1-4.7-4.7z" fill="white" />
                <path d="M9.6 8.9h2l.9 3.5.4 1.8h.1c.1-.6.2-1.1.4-1.8l.9-3.5h2l-2.2 7.5h-2.2L9.6 8.9z" fill="white" />
              </svg>
              <svg className="h-8 w-auto text-stone-400" viewBox="0 0 36 24" fill="currentColor">
                <rect width="36" height="24" rx="4" fill="currentColor" />
                <path d="M22.3 10.7c0-.3-.1-.6-.2-.8-.1-.2-.3-.4-.6-.5-.3-.1-.6-.2-.9-.2h-2.4v3h2.4c.3 0 .6-.1.9-.2.3-.1.5-.3.6-.5.1-.2.2-.5.2-.8zm-1.7 3h-2.4v3.6h-1.6v-9h4c.6 0 1.1.1 1.6.3.5.2.8.5 1.1.9.3.4.4.9.4 1.4 0 .6-.1 1.1-.4 1.5-.3.4-.7.7-1.3.9l1.8 3.9h-1.7l-1.5-3.5z" fill="white" />
                <path d="M13.1 10.8h-2.6v1.9h2.3v1.3h-2.3v1.9h2.6v1.3H8.8v-7.8h4.3v1.4z" fill="white" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
