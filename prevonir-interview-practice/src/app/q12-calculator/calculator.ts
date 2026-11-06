import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

type Op = '+' | '-' | '*' | '/';

/**
 * BASIC interview calculator (~20–25 min).
 * Digits · + − × ÷ · = · C · decimal · no eval
 */
@Component({
  selector: 'app-calculator',
  imports: [RouterLink],
  templateUrl: './calculator.html',
  styleUrl: './calculator.css',
})
export class Calculator {
  display = '0';
  private previous: number | null = null;
  private operator: Op | null = null;
  /** after op/= , next digit starts a new number */
  private fresh = false;

  pressDigit(d: string): void {
    if (this.fresh || this.display === '0') {
      this.display = d;
      this.fresh = false;
      return;
    }
    this.display += d;
  }

  pressDot(): void {
    if (this.fresh) {
      this.display = '0.';
      this.fresh = false;
      return;
    }
    if (!this.display.includes('.')) this.display += '.';
  }

  pressOp(op: Op): void {
    const current = Number(this.display);

    if (this.previous != null && this.operator && !this.fresh) {
      const result = this.compute(this.previous, current, this.operator);
      if (result == null) {
        this.reset('Error');
        return;
      }
      this.display = String(result);
      this.previous = result;
    } else {
      this.previous = current;
    }

    this.operator = op;
    this.fresh = true;
  }

  pressEquals(): void {
    if (this.previous == null || !this.operator) return;

    const result = this.compute(this.previous, Number(this.display), this.operator);
    if (result == null) {
      this.reset('Error');
      return;
    }

    this.display = String(result);
    this.previous = null;
    this.operator = null;
    this.fresh = true;
  }

  clear(): void {
    this.reset('0');
  }

  private compute(a: number, b: number, op: Op): number | null {
    if (op === '+') return a + b;
    if (op === '-') return a - b;
    if (op === '*') return a * b;
    if (op === '/') return b === 0 ? null : a / b;
    return null;
  }

  private reset(display: string): void {
    this.display = display;
    this.previous = null;
    this.operator = null;
    this.fresh = display === 'Error';
  }
}
