import { Injectable } from '@nestjs/common';
import { StoreService } from '../common/store.service';

@Injectable()
export class CompaniesService {
  constructor(private store: StoreService) {}

  async findById(id: string) {
    return this.store.findCompanyById(id);
  }

  async update(id: string, data: { name?: string; settings?: any }) {
    return this.store.updateCompany(id, data);
  }
}