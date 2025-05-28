// cypress/e2e/api_data_handling.cy.js

// Import the service whose functions we want to stub.
// Adjust the path based on your project structure.
// Assuming Cypress is in /cypress and mockApiService is in /src/api/
import * as mockApiService from '../../src/api/mockApiService';

// This spec file tests how the Products Page, Product Detail Page,
// Blog Page, and Blog Post Detail Page handle various API responses.
describe('API Data Handling', () => {
  // --- Sample Data for Products ---
  const sampleProducts = [
    { 
      id: 1, 
      name: 'Cypress Test Product 1', 
      price: 120.50, 
      images: ['test1.jpg', 'test1_thumb.jpg'], 
      category: 'Test Category A', 
      description: 'This is a fantastic test product 1 from Cypress.',
      additionalInfo: 'No additional info.',
      reviews: [{ rating: 5, comment: 'Great!', date: '2023-01-01' }]
    },
    { 
      id: 2, 
      name: 'Cypress Test Product 2', 
      price: 99.99, 
      images: ['test2.jpg', 'test2_thumb.jpg'], 
      category: 'Test Category B', 
      description: 'Another amazing test product 2 brought by Cypress.',
      additionalInfo: 'Also no additional info.',
      reviews: [{ rating: 4, comment: 'Good!', date: '2023-01-02' }]
    },
  ];

  const sampleProductDetail = {
    id: 1,
    name: 'Cypress Detailed Product',
    price: 150.00,
    images: ['detail.jpg', 'detail_thumb1.jpg', 'detail_thumb2.jpg'],
    category: 'Detailed Category',
    description: 'A very detailed description of a Cypress test product. Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    additionalInfo: 'Additional information specific to this detailed product.',
    reviews: [
      { rating: 5, comment: 'Absolutely love it!', date: '2023-02-15' },
      { rating: 4, comment: 'Very good quality.', date: '2023-02-20' }
    ],
    details: "Some HTML <b>details</b> here<br>Another line of detailed information about materials or craftsmanship.",
    care: "Care instructions: Handle with care. Clean with a soft, dry cloth.",
    artisan: "Artisan Rif",
    artisanStory: "The story of Artisan Rif, passionate about handcrafted items from the mountains."
  };

  // --- Sample Data for Blog Posts ---
  const sampleBlogPostsForListing = [
    { id: 1, title: 'My First Blog Post', date: '2023-10-26', author: 'Jane Doe', imageUrl: 'blog1.jpg', summary: 'A short summary of the first post.' },
    { id: 2, title: 'Another Interesting Article', date: '2023-10-27', author: 'John Smith', imageUrl: 'blog2.jpg', summary: 'Brief overview of the second article.' }
  ];

  const sampleBlogPostForDetail = {
    id: 1, 
    title: 'My First Blog Post Detailed', 
    date: '2023-10-26', 
    author: 'Jane Doe', 
    imageUrl: 'blog_detail_1.jpg',
    content: 'Full content here. Lorem ipsum dolor sit amet, consectetur adipiscing elit...',
    // Assuming relatedPosts are not part of the direct getBlogPostById response for now
  };


  // --- Tests for Products Listing Page ---
  context('Products Listing Page API Handling', () => {
    it('should display products when API returns data', () => {
      cy.stub(mockApiService, 'getProducts').resolves(sampleProducts);
      cy.visit('/products');
      sampleProducts.forEach(product => {
        cy.contains('h3', product.name).should('be.visible');
        cy.contains(product.price.toString().replace('.', ',')).should('be.visible'); 
        cy.contains('h3', product.name)
          .closest('div[class*="ProductCard"]')
          .find('button')
          .contains('Ajouter')
          .should('be.visible');
      });
    });

    it('should display "Aucun produit trouvé" when API returns an empty list', () => {
      cy.stub(mockApiService, 'getProducts').resolves([]);
      cy.visit('/products');
      cy.contains('Aucun produit trouvé').should('be.visible');
      cy.get('div[class*="ProductCard"]').should('not.exist');
    });

    it('should display error message and retry button when API fails', () => {
      cy.stub(mockApiService, 'getProducts').rejects(new Error('Failed to fetch products'));
      cy.visit('/products');
      cy.contains('Impossible de charger les produits. Veuillez réessayer plus tard.').should('be.visible');
      cy.contains('button', 'Réessayer').should('be.visible');
    });
  });

  // --- Tests for Product Detail Page ---
  context('Product Detail Page API Data Handling', () => {
    it('should display product details when API returns data for a specific ID', () => {
      cy.stub(mockApiService, 'getProductById').withArgs(sampleProductDetail.id).resolves(sampleProductDetail);
      cy.visit(`/products/${sampleProductDetail.id}`);
      cy.contains('h1', sampleProductDetail.name).should('be.visible');
      cy.contains(sampleProductDetail.price.toString().replace('.', ',')).should('be.visible');
      cy.contains('p', sampleProductDetail.description).should('be.visible');
      cy.contains(sampleProductDetail.category).should('be.visible'); 
      cy.contains('button', 'Ajouter au panier').should('be.visible');
    });

    it('should display "Produit non trouvé" when API returns null for an ID', () => {
      const nonExistentId = 999;
      cy.stub(mockApiService, 'getProductById').withArgs(nonExistentId).resolves(null);
      cy.visit(`/products/${nonExistentId}`);
      cy.contains('h2', 'Produit non trouvé').should('be.visible');
      cy.contains('a', 'Retour aux produits')
        .should('be.visible')
        .and('have.attr', 'href', '/products');
    });

    it('should display "Produit non trouvé" when API call for product detail fails', () => {
      const errorProneId = 777;
      const errorMessage = 'API Error for Product Detail';
      cy.stub(mockApiService, 'getProductById').withArgs(errorProneId).rejects(new Error(errorMessage));
      cy.visit(`/products/${errorProneId}`);
      cy.log(`Intentionally triggered API error: ${errorMessage}`);
      cy.contains('h2', 'Produit non trouvé').should('be.visible');
      cy.contains('a', 'Retour aux produits')
        .should('be.visible')
        .and('have.attr', 'href', '/products');
    });
  });

  // --- Tests for Blog Page (/blog) ---
  context('Blog Page API Data Handling', () => {
    // Test Case 7: Successful Blog Posts Load
    it('should display blog posts when API returns data', () => {
      cy.stub(mockApiService, 'getBlogPosts').resolves(sampleBlogPostsForListing);
      cy.visit('/blog');
      sampleBlogPostsForListing.forEach(post => {
        cy.contains('h2', post.title).should('be.visible'); // Assuming title is in h2 in BlogCard
        cy.contains(post.summary).should('be.visible');
        cy.contains(post.author).should('be.visible');
        // Date formatting might vary, so checking for presence of date string
        cy.contains(post.date).should('be.visible'); 
      });
    });

    // Test Case 8: Empty Blog Post List
    it('should display "Aucun article de blog trouvé" when API returns an empty list', () => {
      cy.stub(mockApiService, 'getBlogPosts').resolves([]);
      cy.visit('/blog');
      cy.contains('Aucun article de blog trouvé pour le moment.').should('be.visible');
      // Check that no blog cards are rendered (assuming a common selector for blog cards)
      cy.get('article[class*="BlogCard"]').should('not.exist'); // Adjust selector if needed
    });

    // Test Case 9: API Error on Blog Posts Load
    it('should display error message and retry button when API fails', () => {
      cy.stub(mockApiService, 'getBlogPosts').rejects(new Error('Failed to fetch blog posts'));
      cy.visit('/blog');
      cy.contains('Erreur lors du chargement des articles.').should('be.visible');
      cy.contains('button', 'Réessayer').should('be.visible');
    });
  });

  // --- Tests for Blog Post Detail Page (/post/:id) ---
  context('Blog Post Detail Page API Data Handling', () => {
    // Test Case 10: Successful Blog Post Detail Load
    it('should display blog post details when API returns data for a specific ID', () => {
      cy.stub(mockApiService, 'getBlogPostById').withArgs(sampleBlogPostForDetail.id).resolves(sampleBlogPostForDetail);
      cy.visit(`/post/${sampleBlogPostForDetail.id}`);
      
      cy.contains('h1', sampleBlogPostForDetail.title).should('be.visible');
      cy.contains(sampleBlogPostForDetail.author).should('be.visible');
      cy.contains(sampleBlogPostForDetail.date).should('be.visible'); // Check for date presence
      cy.contains(sampleBlogPostForDetail.content.substring(0, 100)).should('be.visible'); // Check for part of the content
    });

    // Test Case 11: Blog Post Not Found
    it('should display "Article non trouvé" when API returns null for an ID', () => {
      const nonExistentPostId = 998;
      cy.stub(mockApiService, 'getBlogPostById').withArgs(nonExistentPostId).resolves(null);
      cy.visit(`/post/${nonExistentPostId}`);
      
      cy.contains('h2', 'Article non trouvé').should('be.visible');
      cy.contains('a', 'Retour au blog')
        .should('be.visible')
        .and('have.attr', 'href', '/blog');
    });

    // Test Case 12: API Error on Blog Post Detail Load
    it('should display "Article non trouvé" when API call for blog post detail fails', () => {
      const errorPronePostId = 778;
      const blogPostErrorMessage = 'API Error for Blog Post Detail';
      cy.stub(mockApiService, 'getBlogPostById').withArgs(errorPronePostId).rejects(new Error(blogPostErrorMessage));
      cy.visit(`/post/${errorPronePostId}`);
      
      cy.log(`Intentionally triggered API error: ${blogPostErrorMessage}`);
      
      // Assuming error leads to "not found" UI, similar to ProductDetail
      cy.contains('h2', 'Article non trouvé').should('be.visible');
      cy.contains('a', 'Retour au blog')
        .should('be.visible')
        .and('have.attr', 'href', '/blog');
    });
  });
});
