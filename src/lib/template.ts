import { compile } from 'handlebars';

function interpolate(template: string, data: any) {
  const temp = compile(template);
  return temp(data);
}

export {
  interpolate,
};
