declare module 'node-webpmux' {
  export class Image {
    constructor()
    
    /**
     * Load image from buffer or file path
     */
    load(source: Buffer | string): Promise<void>
    
    /**
     * Save image to file or return buffer
     * @param path - File path to save, or null to return buffer
     */
    save(path: string | null): Promise<Buffer>
    
    /**
     * EXIF metadata
     */
    exif: Buffer | null
    
    /**
     * XMP metadata
     */
    xmp: Buffer | null
    
    /**
     * ICC color profile
     */
    iccp: Buffer | null
  }
  
  export default {
    Image
  }
}