import { ExecutionContext, NestInterceptor } from "@nestjs/common";
import { tap } from "rxjs/operators";
export class Logging4Interceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next) {
    console.log("Before4...");
    const now = Date.now();
    return next.handle().pipe(
      tap(() => {
        console.log(`After4... ${Date.now() - now}ms`);
      })
    );
  }
}
