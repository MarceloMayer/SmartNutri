import { HttpErrorResponse } from '@angular/common/http';
import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import type { EvaluationFile, FileCategory } from '../../core/models/evaluation-file.models';
import { PHOTO_CATEGORIES } from '../../core/models/evaluation-file.models';
import type { CreatePhysicalEvaluationPayload } from '../../core/models/physical-evaluation.models';
import { EvaluationFilesService } from '../../features/evaluation-files/services/evaluation-files.service';
import { PhysicalEvaluationService } from '../../features/physical-evaluations/services/physical-evaluation.service';
import { PatientService } from '../../features/patients/services/patient.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { InputMaskDirective } from '../../shared/directives/input-mask.directive';
import {
  ACTIVITY_LEVELS,
  type ActivityLevel,
  type BiologicalSex,
  type ProtocolStatus,
  type SkinfoldInputs,
  calcAge,
  calcBMR,
  calcJP3,
  calcJP7,
  calcPetroski,
  calcTDEE,
  checkJP3,
  checkJP7,
  checkPetroski
} from '../../features/physical-evaluations/utils/body-composition';

type ViewState = 'idle' | 'loading' | 'error';

@Component({
  selector: 'app-physical-evaluation-form-page',
  standalone: true,
  imports: [ConfirmDialogComponent, DecimalPipe, InputMaskDirective, NgFor, NgIf, ReactiveFormsModule, RouterLink],
  templateUrl: './physical-evaluation-form.page.html',
  styleUrl: './physical-evaluation-form.page.scss'
})
export class PhysicalEvaluationFormPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly evaluationService = inject(PhysicalEvaluationService);
  private readonly filesService = inject(EvaluationFilesService);
  private readonly patientService = inject(PatientService);
  private readonly objectUrls = new Map<number, string>();

  readonly form = new FormGroup({
    evaluatedAt:           new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    weightKg:              new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    heightCm:              new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    goal:                  new FormControl('', { nonNullable: true }),
    waistCm:               new FormControl('', { nonNullable: true }),
    hipCm:                 new FormControl('', { nonNullable: true }),
    abdomenCm:             new FormControl('', { nonNullable: true }),
    chestCm:               new FormControl('', { nonNullable: true }),
    rightArmCm:            new FormControl('', { nonNullable: true }),
    leftArmCm:             new FormControl('', { nonNullable: true }),
    rightForearmCm:        new FormControl('', { nonNullable: true }),
    leftForearmCm:         new FormControl('', { nonNullable: true }),
    rightThighCm:          new FormControl('', { nonNullable: true }),
    leftThighCm:           new FormControl('', { nonNullable: true }),
    rightCalfCm:           new FormControl('', { nonNullable: true }),
    leftCalfCm:            new FormControl('', { nonNullable: true }),
    tricepsSkinfoldMm:     new FormControl('', { nonNullable: true }),
    bicepsSkinfoldMm:      new FormControl('', { nonNullable: true }),
    subscapularSkinfoldMm: new FormControl('', { nonNullable: true }),
    suprailiacSkinfoldMm:  new FormControl('', { nonNullable: true }),
    abdominalSkinfoldMm:   new FormControl('', { nonNullable: true }),
    pectoralSkinfoldMm:    new FormControl('', { nonNullable: true }),
    midaxillarySkinfoldMm: new FormControl('', { nonNullable: true }),
    thighSkinfoldMm:       new FormControl('', { nonNullable: true }),
    calfSkinfoldMm:        new FormControl('', { nonNullable: true }),
    notes:                 new FormControl('', { nonNullable: true })
  });

  readonly activityFactorControl = new FormControl(1.55, { nonNullable: true });
  readonly activityLevels: ActivityLevel[] = ACTIVITY_LEVELS;

  pageState:    ViewState = 'idle';
  actionState:  ViewState = 'idle';
  message = '';
  patientIdForBack = 0;

  // Patient demographics (loaded separately for body composition)
  patientSex:       BiologicalSex | null = null;
  patientBirthDate: string | null        = null;

  // File management state
  readonly photoCategories = PHOTO_CATEGORIES;
  files:              EvaluationFile[] = [];
  filesState:         ViewState        = 'idle';
  uploadingCategory:  FileCategory | null = null;
  uploadingAttachment = false;
  deletingFileId:     number | null    = null;
  filePendingDelete:  EvaluationFile | null = null;
  fileMessage = '';

  // ── Routing helpers ───────────────────────────────────────────────────────

  get patientId(): number {
    return Number(this.route.snapshot.paramMap.get('patientId'));
  }

  get evaluationId(): number | null {
    const id = this.route.snapshot.paramMap.get('id');
    return id ? Number(id) : null;
  }

  get isEditMode(): boolean {
    return this.evaluationId !== null;
  }

  // ── Body composition getters ──────────────────────────────────────────────

  get hasPatientDemographics(): boolean {
    return this.patientSex !== null && this.patientBirthDate !== null;
  }

  private get skinfoldInputs(): SkinfoldInputs {
    const v = this.form.getRawValue();
    return {
      triceps:     parseOptionalNumber(v.tricepsSkinfoldMm),
      biceps:      parseOptionalNumber(v.bicepsSkinfoldMm),
      subscapular: parseOptionalNumber(v.subscapularSkinfoldMm),
      suprailiac:  parseOptionalNumber(v.suprailiacSkinfoldMm),
      abdominal:   parseOptionalNumber(v.abdominalSkinfoldMm),
      pectoral:    parseOptionalNumber(v.pectoralSkinfoldMm),
      midaxillary: parseOptionalNumber(v.midaxillarySkinfoldMm),
      thigh:       parseOptionalNumber(v.thighSkinfoldMm),
      calf:        parseOptionalNumber(v.calfSkinfoldMm)
    };
  }

  private get currentAge(): number | null {
    if (!this.patientBirthDate) return null;
    const evaluatedAtDisplay = this.form.getRawValue().evaluatedAt;
    const evaluatedAtIso = displayToIso(evaluatedAtDisplay);
    if (!evaluatedAtIso) return null;
    return calcAge(this.patientBirthDate, evaluatedAtIso);
  }

  get jp3Status(): ProtocolStatus {
    const sex = this.patientSex;
    const age = this.currentAge;
    if (!sex || age === null) return noDataStatus();

    const status = checkJP3(sex, this.skinfoldInputs);
    if (status.available) {
      const weightKg = parseOptionalNumber(this.form.getRawValue().weightKg) ?? 0;
      status.result = calcJP3(sex, age, this.skinfoldInputs, weightKg);
    }
    return status;
  }

  get jp7Status(): ProtocolStatus {
    const sex = this.patientSex;
    const age = this.currentAge;
    if (!sex || age === null) return noDataStatus();

    const status = checkJP7(this.skinfoldInputs);
    if (status.available) {
      const weightKg = parseOptionalNumber(this.form.getRawValue().weightKg) ?? 0;
      status.result = calcJP7(sex, age, this.skinfoldInputs, weightKg);
    }
    return status;
  }

  get petroskiStatus(): ProtocolStatus {
    const sex = this.patientSex;
    const age = this.currentAge;
    if (!sex || age === null) return noDataStatus();

    const status = checkPetroski(this.skinfoldInputs);
    if (status.available) {
      const v = this.form.getRawValue();
      const weightKg = parseOptionalNumber(v.weightKg) ?? 0;
      const heightCm = parseOptionalNumber(v.heightCm) ?? 0;
      status.result = calcPetroski(sex, age, this.skinfoldInputs, weightKg, heightCm);
    }
    return status;
  }

  get bmr(): number | null {
    const sex = this.patientSex;
    const age = this.currentAge;
    if (!sex || age === null) return null;

    const v = this.form.getRawValue();
    const weightKg = parseOptionalNumber(v.weightKg);
    const heightCm = parseOptionalNumber(v.heightCm);
    if (!weightKg || !heightCm) return null;

    return calcBMR(sex, age, weightKg, heightCm);
  }

  get tdee(): number | null {
    if (this.bmr === null) return null;
    return calcTDEE(this.bmr, Number(this.activityFactorControl.value));
  }

  // ── File getters ──────────────────────────────────────────────────────────

  get photos(): EvaluationFile[] {
    return this.files.filter((f) => f.type === 'photo');
  }

  get attachments(): EvaluationFile[] {
    return this.files.filter((f) => f.type === 'attachment');
  }

  photosForCategory(category: FileCategory): EvaluationFile[] {
    return this.photos.filter((f) => f.category === category);
  }

  objectUrl(file: EvaluationFile): string | null {
    return this.objectUrls.get(file.id) ?? null;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadPatientDemographics();

    if (this.isEditMode) {
      this.loadEvaluation();
      this.loadFiles();
    } else {
      this.patientIdForBack = this.patientId;
      this.form.controls.evaluatedAt.setValue(isoToDisplay(todayIso()));
    }
  }

  ngOnDestroy(): void {
    this.objectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.objectUrls.clear();
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  private loadPatientDemographics(): void {
    this.patientService.findPatientById(this.patientId).subscribe({
      next: (patient) => {
        this.patientSex       = (patient.sex as BiologicalSex | null) ?? null;
        this.patientBirthDate = patient.birthDate ?? null;
      },
      error: () => { /* silencioso — dados demográficos são opcionais para cálculo */ }
    });
  }

  loadEvaluation(): void {
    this.pageState = 'loading';
    this.message = '';

    const id = this.evaluationId as number;

    this.evaluationService.findById(id).subscribe({
      next: (evaluation) => {
        this.patientIdForBack = evaluation.patientId;
        this.form.patchValue({
          evaluatedAt:           isoToDisplay(evaluation.evaluatedAt),
          weightKg:              String(evaluation.weightKg),
          heightCm:              String(evaluation.heightCm),
          goal:                  evaluation.goal ?? '',
          waistCm:               evaluation.waistCm               !== null ? String(evaluation.waistCm)               : '',
          hipCm:                 evaluation.hipCm                 !== null ? String(evaluation.hipCm)                 : '',
          abdomenCm:             evaluation.abdomenCm             !== null ? String(evaluation.abdomenCm)             : '',
          chestCm:               evaluation.chestCm               !== null ? String(evaluation.chestCm)               : '',
          rightArmCm:            evaluation.rightArmCm            !== null ? String(evaluation.rightArmCm)            : '',
          leftArmCm:             evaluation.leftArmCm             !== null ? String(evaluation.leftArmCm)             : '',
          rightForearmCm:        evaluation.rightForearmCm        !== null ? String(evaluation.rightForearmCm)        : '',
          leftForearmCm:         evaluation.leftForearmCm         !== null ? String(evaluation.leftForearmCm)         : '',
          rightThighCm:          evaluation.rightThighCm          !== null ? String(evaluation.rightThighCm)          : '',
          leftThighCm:           evaluation.leftThighCm           !== null ? String(evaluation.leftThighCm)           : '',
          rightCalfCm:           evaluation.rightCalfCm           !== null ? String(evaluation.rightCalfCm)           : '',
          leftCalfCm:            evaluation.leftCalfCm            !== null ? String(evaluation.leftCalfCm)            : '',
          tricepsSkinfoldMm:     evaluation.tricepsSkinfoldMm     !== null ? String(evaluation.tricepsSkinfoldMm)     : '',
          bicepsSkinfoldMm:      evaluation.bicepsSkinfoldMm      !== null ? String(evaluation.bicepsSkinfoldMm)      : '',
          subscapularSkinfoldMm: evaluation.subscapularSkinfoldMm !== null ? String(evaluation.subscapularSkinfoldMm) : '',
          suprailiacSkinfoldMm:  evaluation.suprailiacSkinfoldMm  !== null ? String(evaluation.suprailiacSkinfoldMm)  : '',
          abdominalSkinfoldMm:   evaluation.abdominalSkinfoldMm   !== null ? String(evaluation.abdominalSkinfoldMm)   : '',
          pectoralSkinfoldMm:    evaluation.pectoralSkinfoldMm    !== null ? String(evaluation.pectoralSkinfoldMm)    : '',
          midaxillarySkinfoldMm: evaluation.midaxillarySkinfoldMm !== null ? String(evaluation.midaxillarySkinfoldMm) : '',
          thighSkinfoldMm:       evaluation.thighSkinfoldMm       !== null ? String(evaluation.thighSkinfoldMm)       : '',
          calfSkinfoldMm:        evaluation.calfSkinfoldMm        !== null ? String(evaluation.calfSkinfoldMm)        : '',
          notes:                 evaluation.notes ?? ''
        });
        this.pageState = 'idle';
      },
      error: (error: unknown) => {
        this.pageState = 'error';
        this.message = this.resolveErrorMessage(error, 'Nao foi possivel carregar a avaliacao.');
      }
    });
  }

  loadFiles(): void {
    const evalId = this.evaluationId;
    if (evalId === null) return;

    this.filesState = 'loading';

    this.filesService.listFiles(evalId).subscribe({
      next: (files) => {
        this.files = files;
        this.filesState = 'idle';
        this.loadPhotoThumbnails(files.filter((f) => f.type === 'photo'));
      },
      error: () => {
        this.filesState = 'error';
        this.fileMessage = 'Nao foi possivel carregar os arquivos.';
      }
    });
  }

  private loadPhotoThumbnails(photos: EvaluationFile[]): void {
    photos.forEach((photo) => {
      if (this.objectUrls.has(photo.id)) return;

      this.filesService.getFileContent(photo.id).subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          this.objectUrls.set(photo.id, url);
        },
        error: () => { /* thumbnail não carregou, silencioso */ }
      });
    });
  }

  uploadPhoto(event: Event, category: FileCategory): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.evaluationId) return;

    this.uploadingCategory = category;
    this.fileMessage = '';

    this.filesService.uploadFile(this.evaluationId, file, 'photo', category).subscribe({
      next: (created) => {
        this.files = [...this.files, created];
        this.uploadingCategory = null;
        input.value = '';
        this.loadPhotoThumbnails([created]);
      },
      error: (error: unknown) => {
        this.uploadingCategory = null;
        this.fileMessage = this.resolveErrorMessage(error, 'Nao foi possivel enviar a foto.');
        input.value = '';
      }
    });
  }

  uploadAttachment(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.evaluationId) return;

    this.uploadingAttachment = true;
    this.fileMessage = '';

    this.filesService.uploadFile(this.evaluationId, file, 'attachment', 'document').subscribe({
      next: (created) => {
        this.files = [...this.files, created];
        this.uploadingAttachment = false;
        input.value = '';
      },
      error: (error: unknown) => {
        this.uploadingAttachment = false;
        this.fileMessage = this.resolveErrorMessage(error, 'Nao foi possivel enviar o anexo.');
        input.value = '';
      }
    });
  }

  confirmDeleteFile(file: EvaluationFile): void {
    this.filePendingDelete = file;
  }

  deleteFile(): void {
    const file = this.filePendingDelete;

    if (!file) {
      return;
    }

    this.filePendingDelete = null;
    this.deletingFileId = file.id;
    this.fileMessage = '';

    this.filesService.deleteFile(file.id).subscribe({
      next: () => {
        const url = this.objectUrls.get(file.id);
        if (url) {
          URL.revokeObjectURL(url);
          this.objectUrls.delete(file.id);
        }
        this.files = this.files.filter((f) => f.id !== file.id);
        this.deletingFileId = null;
      },
      error: (error: unknown) => {
        this.deletingFileId = null;
        this.fileMessage = this.resolveErrorMessage(error, 'Nao foi possivel excluir o arquivo.');
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024)            return `${bytes} B`;
    if (bytes < 1024 * 1024)     return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  save(): void {
    this.form.controls.evaluatedAt.markAsTouched();
    this.form.controls.weightKg.markAsTouched();
    this.form.controls.heightCm.markAsTouched();

    if (
      this.form.controls.evaluatedAt.invalid ||
      this.form.controls.weightKg.invalid   ||
      this.form.controls.heightCm.invalid
    ) {
      return;
    }

    this.actionState = 'loading';
    this.message = '';

    const payload  = this.buildPayload();
    const id       = this.evaluationId;
    const request$ = id !== null
      ? this.evaluationService.update(id, payload)
      : this.evaluationService.create(this.patientId, payload);

    request$.subscribe({
      next: () => {
        void this.router.navigateByUrl(`/nutritionist/patients/${this.patientIdForBack}`);
      },
      error: (error: unknown) => {
        this.actionState = 'error';
        this.message = this.resolveErrorMessage(error, 'Nao foi possivel salvar a avaliacao.');
      }
    });
  }

  private buildPayload(): CreatePhysicalEvaluationPayload {
    const v = this.form.getRawValue();

    return {
      evaluatedAt:           displayToIso(v.evaluatedAt) ?? '',
      weightKg:              Number(v.weightKg),
      heightCm:              Number(v.heightCm),
      goal:                  v.goal.trim() || null,
      waistCm:               parseOptionalNumber(v.waistCm),
      hipCm:                 parseOptionalNumber(v.hipCm),
      abdomenCm:             parseOptionalNumber(v.abdomenCm),
      chestCm:               parseOptionalNumber(v.chestCm),
      rightArmCm:            parseOptionalNumber(v.rightArmCm),
      leftArmCm:             parseOptionalNumber(v.leftArmCm),
      rightForearmCm:        parseOptionalNumber(v.rightForearmCm),
      leftForearmCm:         parseOptionalNumber(v.leftForearmCm),
      rightThighCm:          parseOptionalNumber(v.rightThighCm),
      leftThighCm:           parseOptionalNumber(v.leftThighCm),
      rightCalfCm:           parseOptionalNumber(v.rightCalfCm),
      leftCalfCm:            parseOptionalNumber(v.leftCalfCm),
      tricepsSkinfoldMm:     parseOptionalNumber(v.tricepsSkinfoldMm),
      bicepsSkinfoldMm:      parseOptionalNumber(v.bicepsSkinfoldMm),
      subscapularSkinfoldMm: parseOptionalNumber(v.subscapularSkinfoldMm),
      suprailiacSkinfoldMm:  parseOptionalNumber(v.suprailiacSkinfoldMm),
      abdominalSkinfoldMm:   parseOptionalNumber(v.abdominalSkinfoldMm),
      pectoralSkinfoldMm:    parseOptionalNumber(v.pectoralSkinfoldMm),
      midaxillarySkinfoldMm: parseOptionalNumber(v.midaxillarySkinfoldMm),
      thighSkinfoldMm:       parseOptionalNumber(v.thighSkinfoldMm),
      calfSkinfoldMm:        parseOptionalNumber(v.calfSkinfoldMm),
      notes:                 v.notes.trim() || null
    };
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message;

      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }

    return fallback;
  }
}

// ── Module-level helpers ───────────────────────────────────────────────────────

function noDataStatus(): ProtocolStatus {
  return { available: false, missingFields: [], result: null };
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoToDisplay(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function displayToIso(display: string): string | null {
  if (!display || display.length < 10) return null;
  const [d, m, y] = display.split('/');
  if (!d || !m || !y || y.length < 4) return null;
  return `${y}-${m}-${d}`;
}
