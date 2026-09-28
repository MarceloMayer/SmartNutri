import { NgIf } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [NgIf],
  template: `
    <div
      class="confirm-overlay"
      *ngIf="open"
      (click)="onCancel()"
      (keydown.escape)="onCancel()"
    >
      <div
        class="confirm-box"
        role="alertdialog"
        aria-modal="true"
        [attr.aria-labelledby]="titleId"
        [attr.aria-describedby]="messageId"
        (click)="$event.stopPropagation()"
      >
        <h2 [id]="titleId">{{ title }}</h2>
        <p [id]="messageId">{{ message }}</p>
        <div class="confirm-actions">
          <button type="button" class="confirm-cancel" #cancelButton (click)="onCancel()">
            {{ cancelLabel }}
          </button>
          <button type="button" class="confirm-ok" [class.confirm-ok--danger]="danger" (click)="onConfirm()">
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .confirm-overlay {
      position: fixed;
      inset: 0;
      background: rgba(22, 32, 51, 0.45);
      display: grid;
      place-items: center;
      padding: 20px;
      z-index: 1000;
    }

    .confirm-box {
      background: #ffffff;
      border-radius: 12px;
      padding: 24px;
      width: min(100%, 420px);
      box-shadow: 0 20px 45px -15px rgba(22, 32, 51, 0.35);
    }

    .confirm-box h2 {
      margin: 0 0 10px;
      font-size: 18px;
      color: #162033;
    }

    .confirm-box p {
      margin: 0;
      color: #445064;
      font-size: 14.5px;
      line-height: 1.5;
    }

    .confirm-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 22px;
    }

    .confirm-cancel,
    .confirm-ok {
      border-radius: 8px;
      padding: 9px 16px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
    }

    .confirm-cancel {
      background: #ffffff;
      border-color: #dfe5ec;
      color: #445064;
    }

    .confirm-cancel:hover {
      background: #f7f8fa;
    }

    .confirm-ok {
      background: #db2777;
      color: #ffffff;
    }

    .confirm-ok:hover {
      background: #bf1f66;
    }

    .confirm-ok--danger {
      background: #b42318;
    }

    .confirm-ok--danger:hover {
      background: #921c14;
    }

    .confirm-cancel:focus-visible,
    .confirm-ok:focus-visible {
      outline: 2px solid #db2777;
      outline-offset: 2px;
    }
  `]
})
export class ConfirmDialogComponent implements OnChanges {
  @Input() open = false;
  @Input() title = 'Confirmar ação';
  @Input() message = 'Tem certeza que deseja continuar?';
  @Input() confirmLabel = 'Remover';
  @Input() cancelLabel = 'Cancelar';
  @Input() danger = true;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  @ViewChild('cancelButton') private readonly cancelButtonRef?: ElementRef<HTMLButtonElement>;

  readonly titleId = `confirm-dialog-title-${++ConfirmDialogComponent.instanceCount}`;
  readonly messageId = `confirm-dialog-message-${ConfirmDialogComponent.instanceCount}`;

  private static instanceCount = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue === true) {
      queueMicrotask(() => this.cancelButtonRef?.nativeElement.focus());
    }
  }

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
