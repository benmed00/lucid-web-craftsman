/* File_name: src/utils/imagePath.ts
 * this file is used to generate the correct path for images in the assets folder
 * import.meta.env.BASE_URL is used to get the base URL of the application
 */
export const getImagePath = (relativePath: string) =>
  `${import.meta.env.BASE_URL}assets/images/${relativePath}`;
//   return cart;
// };
