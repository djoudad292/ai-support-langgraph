import { Injectable } from '@nestjs/common';
import { StoreService } from '../common/store.service';

@Injectable()
export class DepartmentsService {
  constructor(private store: StoreService) {}

  async list(companyId: string) {
    return this.store.listDepartments(companyId);
  }

  async create(companyId: string, data: { name: string; description?: string; keywords?: string[]; email?: string }) {
    return this.store.createDepartment({ companyId, ...data });
  }

  async delete(id: string) {
    return this.store.deleteDepartment(id);
  }
}