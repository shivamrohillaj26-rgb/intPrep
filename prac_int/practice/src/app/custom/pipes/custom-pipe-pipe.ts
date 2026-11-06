import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'customPipe',
})
export class CustomPipePipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {

    return value + ' - ' + args[0] + ' - ' + args[1];
  }

}
