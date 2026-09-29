import { Component, effect, inject, input, output, signal, viewChild, ElementRef, HostListener, Directive, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Seletor de mes/ano (MM/AAAA) com dropdown — campo "Período" da etapa de
 * experiencias. Abre no clique do input ou do calendario.
 */
@Component({
  selector: 'app-seletor-mes-ano',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="seletor-mes-ano" (clickOutside)="fechar()">
      <div class="seletor-mes-ano__input-wrap">
        <input
          #inputEl
          class="seletor-mes-ano__entrada entrada"
          type="text"
          inputmode="numeric"
          placeholder="MM/AAAA"
          [value]="valorInterno()"
          [disabled]="desabilitado()"
          (click)="alternar()"
          (input)="aoDigitar($event)"
          (blur)="aoSair($event)"
          (keydown)="aoTeclar($event)"
          maxlength="7"
          aria-label="Mês e ano"
          aria-expanded="aberto()"
          aria-controls="painel-meses"
        />
        <button
          type="button"
          class="seletor-mes-ano__icone"
          [disabled]="desabilitado()"
          (click)="alternar()"
          aria-label="Abrir calendário"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/>
            <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </button>
      </div>

      @if (aberto()) {
        <div id="painel-meses" class="seletor-mes-ano__painel" role="dialog" aria-label="Selecionar mês e ano" (click)="$event.stopPropagation()">
          <div class="seletor-mes-ano__cabecalho">
            <button
              type="button"
              class="seletor-mes-ano__ano-btn"
              (click)="anoAnterior()"
              aria-label="Ano anterior"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </button>
            <span class="seletor-mes-ano__ano">{{ anoSelecionado() }}</span>
            <button
              type="button"
              class="seletor-mes-ano__ano-btn"
              (click)="proximoAno()"
              aria-label="Próximo ano"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <div class="seletor-mes-ano__grade">
            @for (mes of MESES; track mes.valor; let i = $index) {
              <button
                type="button"
                class="seletor-mes-ano__mes"
                [class.seletor-mes-ano__mes--selecionado]="mes.valor === mesSelecionado()"
                [class.seletor-mes-ano__mes--atual]="ehMesAtual(mes.valor)"
                [disabled]="desabilitado()"
                (click)="selecionarMes(mes.valor)"
              >
                {{ mes.nome }}
              </button>
            }
          </div>

          <div class="seletor-mes-ano__rodape">
            <button type="button" class="botao botao--secundario" (click)="limpar()">Limpar</button>
            <button type="button" class="botao" (click)="confirmar()">OK</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .seletor-mes-ano {
      position: relative;
      display: inline-flex;
      flex-direction: column;
    }

    .seletor-mes-ano__input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .seletor-mes-ano__entrada {
      padding-right: 2.5rem;
    }

    .seletor-mes-ano__icone {
      position: absolute;
      right: 0.5rem;
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      color: var(--k-texto-placeholder);
      background: transparent;
      border: none;
      cursor: pointer;
      pointer-events: none;
      transition: color 140ms ease;
    }

    .seletor-mes-ano__input-wrap:focus-within .seletor-mes-ano__icone {
      color: var(--k-ouro);
    }

    .seletor-mes-ano__painel {
      position: absolute;
      top: calc(100% + var(--k-s-1));
      left: 0;
      z-index: 20;
      width: 18rem;
      background: var(--k-superficie);
      border: 1px solid var(--k-linha-forte);
      border-radius: var(--k-raio-lg);
      box-shadow: 0 12px 32px rgb(0 0 0 / 50%);
      padding: var(--k-s-3);
      animation: fadeIn 140ms ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-0.5rem); }
      to { opacity: 1; transform: translateY(0); }
    }

    .seletor-mes-ano__cabecalho {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--k-s-3);
      padding-bottom: var(--k-s-2);
      border-bottom: 1px solid var(--k-linha);
    }

    .seletor-mes-ano__ano-btn {
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      color: var(--k-texto);
      background: transparent;
      border: 1px solid var(--k-linha);
      border-radius: var(--k-raio);
      cursor: pointer;
      transition: border-color 140ms ease, color 140ms ease;
    }

    .seletor-mes-ano__ano-btn:hover:not(:disabled) {
      border-color: var(--k-ouro);
      color: var(--k-ouro);
    }

    .seletor-mes-ano__ano-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .seletor-mes-ano__ano {
      font-family: var(--k-sans);
      font-size: var(--k-t-base);
      font-weight: 600;
      color: var(--k-texto);
    }

    .seletor-mes-ano__grade {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--k-s-1);
    }

    .seletor-mes-ano__mes {
      padding: var(--k-s-2) var(--k-s-1);
      font-family: var(--k-sans);
      font-size: var(--k-t-sm);
      color: var(--k-texto);
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--k-raio);
      cursor: pointer;
      transition: background-color 120ms ease, color 120ms ease, border-color 120ms ease;
    }

    .seletor-mes-ano__mes:hover:not(:disabled) {
      background: var(--k-campo);
      color: var(--k-ouro);
    }

    .seletor-mes-ano__mes--selecionado {
      background: var(--k-ouro);
      color: var(--k-fundo);
      border-color: var(--k-ouro);
    }

    .seletor-mes-ano__mes--atual {
      font-weight: 600;
    }

    .seletor-mes-ano__mes:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .seletor-mes-ano__rodape {
      display: flex;
      justify-content: flex-end;
      gap: var(--k-s-2);
      margin-top: var(--k-s-3);
      padding-top: var(--k-s-3);
      border-top: 1px solid var(--k-linha);
    }
  `,
})
export class SeletorMesAno {
  /** Valor inicial vindo do formulario (string "MM/AAAA" ou ""). */
  readonly valor = input<string>('');

  /** Se o componente esta desabilitado. */
  readonly desabilitado = input(false);

  /** Emite o valor selecionado "MM/AAAA". */
  readonly valorChange = output<string>();

  private readonly inputEl = viewChild<ElementRef<HTMLInputElement>>('inputEl');

  /** Raiz do componente: usada para saber se o foco seguiu para dentro do painel. */
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Valor interno editavel. */
  protected readonly valorInterno = signal('');

  protected readonly aberto = signal(false);
  protected readonly mesSelecionado = signal<number | null>(null);
  protected readonly anoSelecionado = signal<number>(new Date().getFullYear());

  readonly MESES = [
    { valor: 1, nome: 'Jan' },
    { valor: 2, nome: 'Fev' },
    { valor: 3, nome: 'Mar' },
    { valor: 4, nome: 'Abr' },
    { valor: 5, nome: 'Mai' },
    { valor: 6, nome: 'Jun' },
    { valor: 7, nome: 'Jul' },
    { valor: 8, nome: 'Ago' },
    { valor: 9, nome: 'Set' },
    { valor: 10, nome: 'Out' },
    { valor: 11, nome: 'Nov' },
    { valor: 12, nome: 'Dez' },
  ];

  /** Normaliza para "MM/AAAA"; devolve '' se incompleto ou mes inexistente. */
  private normalizar(bruto: string): string {
    const digitos = bruto.replace(/\D/g, '');
    if (digitos.length < 5) return '';
    const mes = digitos.slice(0, 2);
    const ano = digitos.slice(2, 6);
    const numeroDoMes = Number(mes);
    if (numeroDoMes < 1 || numeroDoMes > 12) return '';
    return `${mes}/${ano}`;
  }

  /** Leva o valor ao formulario; so emite quando difere do que o pai tem. */
  private comitar(): void {
    const valor = this.normalizar(this.valorInterno());
    this.valorInterno.set(valor);
    this.mesSelecionado.set(valor ? Number(valor.slice(0, 2)) : null);
    if (valor) this.anoSelecionado.set(Number(valor.slice(3)));
    if (valor !== this.valor()) {
      this.valorChange.emit(valor);
    }
  }

  /** Verifica se o mes/ano e o atual. */
  protected ehMesAtual(mes: number): boolean {
    const agora = new Date();
    return mes === agora.getMonth() + 1 && this.anoSelecionado() === agora.getFullYear();
  }

  /** Sincroniza valor interno quando o input do pai muda. */
  private readonly sincronizarInput = effect(() => {
    const v = this.valor();
    if (v && v !== this.valorInterno()) {
      this.valorInterno.set(v);
    }
  });

  protected alternar(): void {
    if (this.desabilitado()) return;
    this.aberto.update(a => !a);
    if (this.aberto()) {
      this.sincronizarDoValor();
    }
  }

  protected fechar(): void {
    this.aberto.set(false);
  }

  protected aoDigitar(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    let valor = input.value.replace(/\D/g, '');
    if (valor.length > 2) {
      valor = `${valor.slice(0, 2)}/${valor.slice(2, 6)}`;
    }
    input.value = valor;
    this.valorInterno.set(valor);
  }

  /**
   * O painel so fecha se o foco sair de verdade: clicar num mes roubava o
   * foco do input e o `setTimeout` fechava antes do clique terminar.
   */
  protected aoSair(evento: FocusEvent): void {
    const destino = evento.relatedTarget as Node | null;
    const continuouDentro = !!destino && this.host.nativeElement.contains(destino);
    if (continuouDentro) return;

    // Foco saiu (Tab, clique fora, fechar aba): o que estiver digitado vale.
    this.comitar();
    setTimeout(() => this.fechar(), 150);
  }

  protected aoTeclar(evento: KeyboardEvent): void {
    if (evento.key === 'Escape') {
      this.fechar();
    }
    if (evento.key === 'Enter') {
      this.confirmar();
    }
  }

  protected sincronizarDoValor(): void {
    const v = this.valor();
    if (v) {
      const [mes, ano] = v.split('/');
      if (mes) this.mesSelecionado.set(parseInt(mes, 10));
      if (ano) this.anoSelecionado.set(parseInt(ano, 10));
    } else {
      this.mesSelecionado.set(null);
    }
  }

  protected anoAnterior(): void {
    this.anoSelecionado.update(a => a - 1);
  }

  protected proximoAno(): void {
    this.anoSelecionado.update(a => a + 1);
  }

  /** Escolher o mes ja entrega o valor e fecha o painel. */
  protected selecionarMes(mes: number): void {
    this.mesSelecionado.set(mes);
    this.valorInterno.set(`${String(mes).padStart(2, '0')}/${this.anoSelecionado()}`);
    if (this.valorInterno() !== this.valor()) {
      this.valorChange.emit(this.valorInterno());
    }
    this.fechar();
  }

  protected confirmar(): void {
    this.comitar();
    this.fechar();
  }

  protected limpar(): void {
    this.valorInterno.set('');
    this.mesSelecionado.set(null);
    if (this.valor() !== '') {
      this.valorChange.emit('');
    }
    this.fechar();
  }
}

/** Diretiva para detectar click fora do elemento. */
@Directive({
  selector: '[clickOutside]',
  standalone: true,
})
export class ClickOutsideDirective {
  @Output() clickOutside = new EventEmitter<void>();

  constructor(private readonly el: ElementRef) {}

  @HostListener('document:click', ['$event'])
  aoClicarNoDocumento(evento: MouseEvent): void {
    if (!this.el.nativeElement.contains(evento.target)) {
      this.clickOutside.emit();
    }
  }
}