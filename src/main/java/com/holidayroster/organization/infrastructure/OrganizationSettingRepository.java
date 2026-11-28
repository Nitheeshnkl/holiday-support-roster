package com.holidayroster.organization.infrastructure;

import com.holidayroster.organization.domain.OrganizationSetting;
import java.util.Optional;
import org.springframework.data.repository.Repository;

public interface OrganizationSettingRepository extends Repository<OrganizationSetting, Long> {
    <S extends OrganizationSetting> S save(S entity);
    Optional<OrganizationSetting> findById(Long id);
}
