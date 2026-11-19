import { Pipe, PipeTransform } from '@angular/core';

import { toRoman } from './roman';

/** `{{ count | roman }}`: see toRoman for what is and is not converted. */
@Pipe({ name: 'roman' })
export class RomanPipe implements PipeTransform {
  transform(value: number): string {
    return toRoman(value);
  }
}
