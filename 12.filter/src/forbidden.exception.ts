// 自定义异常
import { HttpException, HttpStatus } from "@nestjs/common";
export class ForbiddenException extends HttpException {
  constructor() {
    super("Forbidden", HttpStatus.FORBIDDEN);
  }
}
