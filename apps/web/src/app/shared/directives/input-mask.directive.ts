import { Directive, ElementRef, HostListener, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { NgControl } from '@angular/forms';
import type { Subscription } from 'rxjs';

type InputMaskType = 'cep' | 'cpf' | 'date' | 'phone';

@Directive({
  selector: 'input[appInputMask]',
  standalone: true
})
export class InputMaskDirective implements OnInit, OnDestroy {
  private readonly elementRef = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly ngControl = inject(NgControl, { optional: true });
  private valueChangesSubscription?: Subscription;
  private isApplyingMask = false;

  @Input({ required: true }) appInputMask!: InputMaskType;

  ngOnInit(): void {
    this.applyMask(this.elementRef.nativeElement.value);

    this.valueChangesSubscription = this.ngControl?.control?.valueChanges.subscribe((value) => {
      if (this.isApplyingMask) {
        return;
      }

      this.applyMask(String(value ?? ''));
    });
  }

  ngOnDestroy(): void {
    this.valueChangesSubscription?.unsubscribe();
  }

  @HostListener('input', ['$event.target.value'])
  onInput(value: string): void {
    this.applyMask(value);
  }

  private applyMask(value: string): void {
    const maskedValue = formatMaskedValue(value, this.appInputMask);
    const input = this.elementRef.nativeElement;

    if (input.value !== maskedValue) {
      input.value = maskedValue;
      input.setSelectionRange(maskedValue.length, maskedValue.length);
    }

    if (this.ngControl?.control && this.ngControl.control.value !== maskedValue) {
      this.isApplyingMask = true;
      this.ngControl.control.setValue(maskedValue, { emitEvent: false });
      this.isApplyingMask = false;
    }
  }
}

function formatMaskedValue(value: string, mask: InputMaskType): string {
  const digits = onlyDigits(value);

  if (mask === 'cpf') {
    return formatCpf(digits);
  }

  if (mask === 'cep') {
    return formatCep(digits);
  }

  if (mask === 'date') {
    return formatDate(digits);
  }

  return formatPhone(digits);
}

function formatCpf(value: string): string {
  const digits = value.slice(0, 11);
  const first = digits.slice(0, 3);
  const second = digits.slice(3, 6);
  const third = digits.slice(6, 9);
  const check = digits.slice(9, 11);

  return joinMaskParts([
    first,
    second && `.${second}`,
    third && `.${third}`,
    check && `-${check}`
  ]);
}

function formatCep(value: string): string {
  const digits = value.slice(0, 8);
  const prefix = digits.slice(0, 5);
  const suffix = digits.slice(5, 8);

  return joinMaskParts([
    prefix,
    suffix && `-${suffix}`
  ]);
}

function formatPhone(value: string): string {
  const digits = value.slice(0, 11);
  const areaCode = digits.slice(0, 2);
  const firstPartLength = digits.length > 10 ? 5 : 4;
  const firstPart = digits.slice(2, 2 + firstPartLength);
  const secondPart = digits.slice(2 + firstPartLength, 11);

  return joinMaskParts([
    areaCode && `(${areaCode}`,
    areaCode.length === 2 && ')',
    firstPart && ` ${firstPart}`,
    secondPart && `-${secondPart}`
  ]);
}

function formatDate(digits: string): string {
  const d = digits.slice(0, 8);
  const day   = d.slice(0, 2);
  const month = d.slice(2, 4);
  const year  = d.slice(4, 8);

  return joinMaskParts([
    day,
    month && `/${month}`,
    year  && `/${year}`
  ]);
}

function joinMaskParts(parts: Array<string | false>): string {
  return parts.filter(Boolean).join('');
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}
