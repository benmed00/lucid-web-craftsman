/**
 * Interface representing an Instagram post in the application.
 * This interface defines the structure of Instagram posts used throughout the application,
 * particularly in the Instagram feed component.
 *
 * @interface InstagramPost
 * @property {number} id - Unique identifier for the Instagram post
 * @property {string} image - URL path to the post's image asset
 * @property {number} likes - Number of likes the post has received
 * @property {string} caption - Text caption/description of the post
 * @property {string} dateISO - ISO 8601 formatted date string indicating when the post was created
 * @property {string[]} tags - Array of string tags associated with the post
 */
export interface InstagramPost {
  /** Unique identifier for the Instagram post */
  id: number;

  /** URL path to the post's image asset */
  image: string;

  /** Number of likes the post has received */
  likes: number;

  /** Text caption/description of the post */
  caption: string;

  /** ISO 8601 formatted date string indicating when the post was created */
  dateISO: string;

  /** Array of string tags associated with the post */
  tags: string[];
}