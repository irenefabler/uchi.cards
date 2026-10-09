import { createElement } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

type MathTag =
  | 'math'
  | 'mrow'
  | 'mfrac'
  | 'msqrt'
  | 'mi'
  | 'mn'
  | 'mo'
  | 'mspace'
  | 'mtext'
  | 'msubsup'
  | 'msup'
  | 'msub';
function MathNode({ tag, children, ...props }: HTMLAttributes<MathMLElement> & { tag: MathTag; width?: string }) {
  return createElement(tag, props, children);
}

const symbols: Record<string, string> = {
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  theta: 'θ',
  pi: 'π',
  mu: 'μ',
  rho: 'ρ',
  sigma: 'σ',
  omega: 'ω',
  Delta: 'Δ',
  Omega: 'Ω',
  cdot: '·',
  times: '×',
  pm: '±',
  le: '≤',
  ge: '≥',
  neq: '≠'
};

// Small, explicit MathML grammar: safe React nodes; unsupported commands stay visible as source.
function renderMath(latex: string): ReactNode {
  let position = 0;
  const input = latex.replace(/\\(?:left|right)/g, '').replace(/\\[,;! ]/g, ' ');
  function group(): ReactNode {
    if (input[position] === '{') {
      position++;
      const result = sequence('}');
      if (input[position++] !== '}') throw new Error('Unbalanced math');
      return <MathNode tag="mrow">{result}</MathNode>;
    }
    return atom();
  }
  function atom(): ReactNode {
    if (position >= input.length) throw new Error('Incomplete math');
    const character = input[position++];
    if (character === '\\') {
      const command = input.slice(position).match(/^[A-Za-z]+/)?.[0];
      if (!command) throw new Error('Unsupported command');
      position += command.length;
      if (command === 'frac')
        return (
          <MathNode tag="mfrac">
            {group()}
            {group()}
          </MathNode>
        );
      if (command === 'sqrt') return <MathNode tag="msqrt">{group()}</MathNode>;
      if (symbols[command]) return <MathNode tag="mi">{symbols[command]}</MathNode>;
      throw new Error('Unsupported command');
    }
    if (/[0-9]/.test(character)) return <MathNode tag="mn">{character}</MathNode>;
    if (/[A-Za-zΑ-ω]/.test(character)) return <MathNode tag="mi">{character}</MathNode>;
    if ('+-−=()?·×±<>[]/'.includes(character)) return <MathNode tag="mo">{character}</MathNode>;
    if ('^_{}'.includes(character)) throw new Error('Invalid math');
    if (character === ' ') return <MathNode tag="mspace" width="0.2em" />;
    return <MathNode tag="mtext">{character}</MathNode>;
  }
  function sequence(end?: string): ReactNode[] {
    const nodes: ReactNode[] = [];
    while (position < input.length && input[position] !== end) {
      let node = group();
      let sup: ReactNode, sub: ReactNode;
      while (input[position] === '^' || input[position] === '_') {
        const operator = input[position++];
        if (operator === '^') {
          if (sup) throw new Error('Duplicate exponent');
          sup = group();
        } else sub = group();
      }
      if (sup && sub)
        node = (
          <MathNode tag="msubsup">
            {node}
            {sub}
            {sup}
          </MathNode>
        );
      else if (sup)
        node = (
          <MathNode tag="msup">
            {node}
            {sup}
          </MathNode>
        );
      else if (sub)
        node = (
          <MathNode tag="msub">
            {node}
            {sub}
          </MathNode>
        );
      nodes.push(
        <MathNode tag="mrow" key={nodes.length}>
          {node}
        </MathNode>
      );
    }
    return nodes;
  }
  const result = sequence();
  return (
    <MathNode tag="math" aria-label={latex}>
      <MathNode tag="mrow">{result}</MathNode>
    </MathNode>
  );
}
export function CardText({ text }: { text: string }) {
  const parts = text.split(/(\\\([\s\S]*?\\\))/g);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('\\(') && part.endsWith('\\)')) {
          try {
            return <span key={index}>{renderMath(part.slice(2, -2))}</span>;
          } catch {
            return (
              <span key={index} title="Проверь формулу">
                {part} <small>Проверь формулу</small>
              </span>
            );
          }
        }
        return (
          <span key={index}>
            {part}
            {(part.includes('\\(') || part.includes('\\)')) && <small>Проверь формулу</small>}
          </span>
        );
      })}
    </>
  );
}
