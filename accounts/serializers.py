from rest_framework import serializers
from .models import User, Organization


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password", "role", "organization"]
        extra_kwargs = {
            # For now we treat organization as optional and default to a single-tenant org.
            "organization": {"required": False, "allow_null": True},
        }

    def create(self, validated_data):
        password = validated_data.pop("password")
        org = validated_data.pop("organization", None)

        if org is None:
            # Single-tenant default organization for now.
            org, _ = Organization.objects.get_or_create(
                slug="default", defaults={"name": "Default Organization"}
            )

        user = User(**validated_data)
        user.organization = org
        user.set_password(password)
        user.save()
        return user