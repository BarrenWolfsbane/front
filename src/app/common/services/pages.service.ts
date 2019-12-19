import { Injectable } from '@angular/core';

/**
 * Shared logic between internal '/p/' page loading components.
 * e.g. header, footer.
 *
 * @author Ben Hayward
 */
@Injectable()
export class PagesService {
  private internalPageRegex: RegExp = /^p\/\w+/g; ///^p\/*$/gm; // matches 'p/' in first and second position.
  // p/terms-of-service
  constructor() {}

  /**
   * Determines whether or not the link given is an internal page or external link.
   * @param { string } path - the path to be checked.
   *
   * @returns true if regex matches that of an internal page '/p/'.
   */
  public isInternalLink = (path: string): any =>
    path.match(this.internalPageRegex);
}
