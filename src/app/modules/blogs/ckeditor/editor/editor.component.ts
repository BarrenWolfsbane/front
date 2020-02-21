/**
 * @author Ben Hayward
 * @desc Wrapper for CKEditor5 text editor.
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { isPlatformServer } from '@angular/common';
declare var require: any;

@Component({
  selector: 'm-blog__editor',
  host: {
    class: 'm-blog',
  },
  templateUrl: 'editor.component.html',
})
export class BlogEditorComponent {
  @Input() content: string;
  @Output() contentChanged: EventEmitter<Event> = new EventEmitter<Event>();

  Editor: any;

  // TODO: Manually adjust configuration when custom built.
  editorConfig: Object = {
    /**
      plugins: [ Alignment ],
      alignment: {
        options: [ 'left', 'right' ]
      },
      toolbar: [
        'heading',
        '|',
        'bulletedList',
        'numberedList',
        'alignment',
        'undo',
        'redo',
        'bold',
        'italic',
        'bulletedList',
        'numberedList',
        'blockQuote',
      ],
    */
  };
  constructor(@Inject(PLATFORM_ID) protected platformId: Object) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      const BalloonEditor = require('@ckeditor/ckeditor5-build-balloon');
      this.Editor = BalloonEditor;
    }
  }

  /**
   * Called on content change. Emits current content value.
   * @param Event - change event.
   */
  onContentChanged($event: Event): void {
    this.contentChanged.emit($event);
  }
}
