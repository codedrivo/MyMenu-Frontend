import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'numberFormat',
  standalone: true
})
export class NumberFormatPipe implements PipeTransform {

  transform(value: number): string {
    if (value >= 1_000_000_000) {
      return (value / 1_000_000_000).toFixed(1).replace('.0','') + 'B+';
    } else if (value >= 1_000_000) {
      return (value / 1_000_000).toFixed(1).replace('.0','') + 'M+';
    } else if (value >= 1_000) {
      return (value / 1_000).toFixed(0) + 'K+';
    }
    return Math.floor(value).toString();
  }

}
